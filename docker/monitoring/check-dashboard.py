#!/usr/bin/env python3
"""Says why the Grafana dashboard shows "No data" - and with --fix, repairs it.

Runs every query in grafana/dashboards/docker-overview.json against Prometheus
and lists the panels that come back empty, after the scrape status of every
collector - an exporter that is down explains a whole row at once.

Standard library and the docker CLI only, so it works on an air-gapped DGX Spark:

  python3 docker/monitoring/check-dashboard.py          report, change nothing
  python3 docker/monitoring/check-dashboard.py --fix    also restart what is stuck
  python3 docker/monitoring/check-dashboard.py http://127.0.0.1:9090 --fix

What --fix does, each found the hard way on a Spark:

  - A job the dashboard reads that Prometheus has no target for: Prometheus reads
    prometheus.yml only when it starts, so it is restarted.
  - An exporter that is DOWN - node-exporter answering 503 once 40 scrapes were
    stuck in flight - is restarted, and node-exporter's collectors are then timed
    one at a time so a collector that hangs is named rather than guessed at.
  - The app itself is never restarted: that would cut off everyone using it.

The default address is Prometheus's published port (PROMETHEUS_PUBLISH_PORT).
Exits 0 when every panel has data, 1 when some do not, 2 when Prometheus cannot
be reached.
"""
import argparse
import json
import pathlib
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request

DASHBOARD = pathlib.Path(__file__).resolve().parent / "grafana" / "dashboards" / "docker-overview.json"
PROMETHEUS_CONTAINER = "nexusai-prometheus"
# The containers --fix may restart, by scrape job. Container names are fixed by
# the compose files. The app is deliberately absent.
RESTARTABLE = {
    "node-exporter": "nexusai-node-exporter",
    "cadvisor": "nexusai-cadvisor",
    "nvidia-gpu": "nexusai-gpu-exporter",
}
# Grafana fills these in; any fixed window gives the same yes-or-no answer.
SUBSTITUTIONS = {"$__range": "6h", "$__rate_interval": "1m", "$__interval": "1m"}
# A collector slower than this is worth naming; Prometheus gives up at 10s.
SLOW_COLLECTOR_S = 2.0


def api(prom, path, params=None):
    url = f"{prom}/api/v1/{path}" + ("?" + urllib.parse.urlencode(params) if params else "")
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            body = json.load(response)
    except Exception as error:  # the report is the point - never a traceback
        return None, str(error)
    if body.get("status") != "success":
        return None, body.get("error", "request failed")
    return body["data"], None


def docker(*args, timeout=120):
    """(exit code, combined output). 127 when there is no docker CLI here."""
    try:
        done = subprocess.run(
            ["docker", *args], capture_output=True, text=True, timeout=timeout
        )
    except FileNotFoundError:
        return 127, "docker CLI not found"
    except subprocess.TimeoutExpired:
        return 124, f"timed out after {timeout}s"
    return done.returncode, (done.stdout or "") + (done.stderr or "")


def fetch_from_network(url, timeout):
    """GET a URL from inside the compose network - exporters publish no host port.

    Goes through the Prometheus container's own busybox wget, which is on that
    network already, so nothing new has to be pulled onto an offline host.
    Returns (ok, body or error, seconds).
    """
    started = time.monotonic()
    code, out = docker(
        "exec", PROMETHEUS_CONTAINER, "wget", "-q", "-T", str(timeout), "-O", "-", url,
        timeout=timeout + 10,
    )
    return code == 0, out, time.monotonic() - started


def collect_targets(prom, dashboard):
    data, error = api(prom, "targets")
    if error:
        return None, None, error
    active = sorted(data["activeTargets"], key=lambda t: t["labels"].get("job", ""))
    configured = {t["labels"].get("job") for t in active}
    wanted = {
        job
        for panel in dashboard["panels"]
        for target in panel.get("targets", [])
        for job in re.findall(r'job="([^"]+)"', target["expr"])
    }
    return active, sorted(wanted - configured), None


def print_targets(prom, active, missing, after_restart=False):
    print(f"Collectors scraped by {prom}:")
    for target in active:
        state = "up" if target["health"] == "up" else "DOWN"
        print(f"  {state:4}  {target['labels'].get('job', '?'):14} {target['labels'].get('instance', '')}")
        # Why it is down, in Prometheus's words: connection refused means the
        # container is not running, no such host that it is not on the network,
        # 503 from node-exporter that its in-flight request limit is used up.
        if state == "DOWN" and target.get("lastError"):
            print(f"        {target['lastError']}")
    # A job the dashboard reads that Prometheus has no target for is not a
    # collector that is down - it is a Prometheus still running an older
    # prometheus.yml, which it reads only when it starts.
    for job in missing:
        if after_restart:
            # A fresh Prometheus still without it: the file itself lacks the job.
            print(f"  MISSING  {job:12} still not scraped after a restart - the prometheus.yml this")
            print("                        Prometheus mounts has no such job. Copy docker/monitoring/prometheus.yml")
            print("                        from the bundle over it, then run --fix again.")
        else:
            print(f"  MISSING  {job:12} not scraped at all - Prometheus predates this job in prometheus.yml")


def check_panels(prom, dashboard):
    empty, checked = [], 0
    for panel in dashboard["panels"]:
        for target in panel.get("targets", []):
            expr = target["expr"]
            for placeholder, value in SUBSTITUTIONS.items():
                expr = expr.replace(placeholder, value)
            checked += 1
            data, error = api(prom, "query", {"query": expr})
            if error or not data["result"]:
                empty.append((panel["title"], target.get("legendFormat", ""), error or "no series", expr))
    return checked, empty


def print_panels(checked, empty):
    print(f"\nPanel queries: {checked - len(empty)} of {checked} return data.")
    for title, legend, reason, expr in empty:
        print(f"  EMPTY  {title} [{legend}] - {reason}\n         {expr}")


def diagnose_node_exporter(instance):
    """Read-only: what a full scrape looks like right now."""
    print(f"\nnode-exporter, full scrape of {instance}:")
    ok, body, seconds = fetch_from_network(f"http://{instance}/metrics", 20)
    if not ok:
        print(f"  failed after {seconds:.1f}s: {body.strip().splitlines()[-1] if body.strip() else 'no output'}")
        if "503" in body:
            print("  503 means 40 scrapes are already in flight: earlier ones hung and never")
            print("  finished. A restart clears them; the collector timing after it shows whether")
            print("  one of them hangs.")
        return
    print(f"  HTTP 200 in {seconds:.2f}s")
    in_flight, by_code, failed, durations = None, {}, [], []
    for line in body.splitlines():
        if line.startswith("promhttp_metric_handler_requests_in_flight "):
            in_flight = line.split()[-1]
        elif line.startswith("promhttp_metric_handler_requests_total{"):
            by_code[re.search(r'code="(\d+)"', line).group(1)] = line.split()[-1]
        elif line.startswith("node_scrape_collector_success{") and line.endswith(" 0"):
            failed.append(re.search(r'collector="([^"]+)"', line).group(1))
        elif line.startswith("node_scrape_collector_duration_seconds{"):
            durations.append((float(line.split()[-1]), re.search(r'collector="([^"]+)"', line).group(1)))
    print(f"  requests in flight: {in_flight}   served so far by status: {by_code}")
    if by_code.get("503", "0") != "0":
        print("  It has refused scrapes with 503 since it started - requests have been piling up.")
    if failed:
        print(f"  collectors reporting failure: {', '.join(sorted(failed))}")
    if durations:
        slowest = ", ".join(f"{name} {value:.3f}s" for value, name in sorted(durations, reverse=True)[:5])
        print(f"  slowest collectors: {slowest}")


def time_collectors(container, instance):
    """After a restart: each enabled collector on its own, to name one that hangs."""
    code, logs = docker("logs", container)
    collectors, listing = set(), False
    for line in logs.splitlines():
        if 'msg="Enabled collectors"' in line:
            listing = True
            continue
        match = re.search(r"msg=([a-z_0-9]+)$", line) if listing else None
        if match:
            collectors.add(match.group(1))
        else:
            listing = False
    if not collectors:
        print("  could not read the enabled collectors from its log - skipping the timing")
        return
    print(f"  timing {len(collectors)} collectors one at a time (15s limit each)...")
    trouble = []
    for name in sorted(collectors):
        ok, body, seconds = fetch_from_network(
            f"http://{instance}/metrics?" + urllib.parse.urlencode({"collect[]": name}), 15
        )
        if not ok or seconds > SLOW_COLLECTOR_S:
            trouble.append((name, ok, seconds))
    if not trouble:
        print(f"  every collector answered within {SLOW_COLLECTOR_S:.0f}s - none hangs right now.")
        print("  If it goes DOWN with 503 again, run --fix again at that moment. A collector")
        print("  that is slow then is the cause; if none is, the hang comes and goes - keep")
        print("  both outputs.")
        return
    for name, ok, seconds in trouble:
        print(f"  {'FAILED' if not ok else 'SLOW':6} {name}: {seconds:.1f}s")
    names = ",".join(name for name, _, _ in trouble)
    print(f"  Disable with --no-collector.<name> on node-exporter in docker-compose.yml ({names}).")


def wait_until_healthy(prom, dashboard, restarted, seconds=90):
    """Poll until the restarted jobs are scraped again and every panel has data."""
    deadline = time.monotonic() + seconds
    print(f"\nWaiting up to {seconds}s for Prometheus to scrape again...")
    while True:
        active, missing, error = collect_targets(prom, dashboard)
        if not error:
            down = [t for t in active if t["health"] != "up"]
            if not missing and not down:
                checked, empty = check_panels(prom, dashboard)
                # rate() needs two scrapes, so a just-restarted exporter's panels
                # fill in a scrape interval after its target turns up.
                if not empty:
                    return active, missing
        if time.monotonic() >= deadline:
            return collect_targets(prom, dashboard)[:2]
        time.sleep(5)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("prometheus", nargs="?", default="http://127.0.0.1:9090")
    parser.add_argument("--fix", action="store_true", help="restart Prometheus or exporters that are stuck")
    args = parser.parse_args()
    prom = args.prometheus.rstrip("/")
    dashboard = json.loads(DASHBOARD.read_text(encoding="utf-8"))

    active, missing, error = collect_targets(prom, dashboard)
    if error:
        print(f"Cannot query Prometheus at {prom}: {error}")
        print("Is the stack up, and is this the published port? Pass the address as an argument.")
        return 2
    print_targets(prom, active, missing)

    down = [t for t in active if t["health"] != "up"]
    node_exporter = next((t for t in down if t["labels"].get("job") == "node-exporter"), None)
    if node_exporter:
        diagnose_node_exporter(node_exporter["labels"]["instance"])

    restarts = []
    if missing:
        restarts.append((PROMETHEUS_CONTAINER, f"picks up {', '.join(missing)} from prometheus.yml"))
    for target in down:
        container = RESTARTABLE.get(target["labels"].get("job"))
        if container:
            restarts.append((container, "scraping it fails"))
    app_down = [t for t in down if t["labels"].get("job") == "nexusai"]
    if app_down:
        print("\nThe app itself is DOWN. Not restarted by this script - check: docker logs --tail 50 nexusai")

    if restarts and not args.fix:
        print("\nWith --fix this would restart:")
        for container, why in restarts:
            print(f"  {container}  ({why})")
        # Answered as it is now, so the report also shows what those restarts would bring back.
        print_panels(*check_panels(prom, dashboard))
        return 1

    if restarts:
        print()
        for container, why in restarts:
            code, out = docker("restart", container)
            print(f"Restarted {container} ({why})" if code == 0 else f"Could not restart {container}: {out.strip()}")
        if node_exporter and any(c == RESTARTABLE["node-exporter"] for c, _ in restarts):
            time.sleep(3)  # let it start listening before timing collectors
            print("\nnode-exporter after the restart:")
            time_collectors(RESTARTABLE["node-exporter"], node_exporter["labels"]["instance"])
        active, missing = wait_until_healthy(prom, dashboard, [c for c, _ in restarts])
        print()
        print_targets(prom, active or [], missing or [], after_restart=True)

    checked, empty = check_panels(prom, dashboard)
    print_panels(checked, empty)
    return 1 if empty else 0


if __name__ == "__main__":
    sys.exit(main())
