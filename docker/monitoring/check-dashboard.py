#!/usr/bin/env python3
"""Says why the Grafana dashboard shows "No data", from the host it runs on.

Runs every query in grafana/dashboards/docker-overview.json against Prometheus
and lists the panels that come back empty, after the scrape status of every
collector - an exporter that is down explains a whole row at once.

Standard library only, so it works on an air-gapped DGX Spark as it is:

  python3 docker/monitoring/check-dashboard.py
  python3 docker/monitoring/check-dashboard.py http://127.0.0.1:9090

The default address is Prometheus's published port (PROMETHEUS_PUBLISH_PORT).
Exits 1 when any panel is empty.
"""
import json
import pathlib
import sys
import urllib.parse
import urllib.request

PROM = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:9090").rstrip("/")
DASHBOARD = pathlib.Path(__file__).resolve().parent / "grafana" / "dashboards" / "docker-overview.json"


def query(expr):
    url = f"{PROM}/api/v1/query?" + urllib.parse.urlencode({"query": expr})
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            body = json.load(response)
    except Exception as error:  # the report is the point - never a traceback
        return None, str(error)
    if body.get("status") != "success":
        return None, body.get("error", "query failed")
    return body["data"]["result"], None


def main():
    targets, error = query("up")
    if error:
        print(f"Cannot query Prometheus at {PROM}: {error}")
        print("Is the stack up, and is this the published port? Pass the address as an argument.")
        return 2

    print(f"Collectors scraped by {PROM}:")
    for target in sorted(targets, key=lambda t: t["metric"].get("job", "")):
        state = "up" if target["value"][1] == "1" else "DOWN"
        print(f"  {state:4}  {target['metric'].get('job', '?'):14} {target['metric'].get('instance', '')}")

    # Grafana fills these in; any fixed window gives the same yes-or-no answer.
    substitutions = {"$__range": "6h", "$__rate_interval": "1m", "$__interval": "1m"}
    dashboard = json.loads(DASHBOARD.read_text(encoding="utf-8"))
    empty, checked = [], 0
    for panel in dashboard["panels"]:
        for target in panel.get("targets", []):
            expr = target["expr"]
            for placeholder, value in substitutions.items():
                expr = expr.replace(placeholder, value)
            checked += 1
            result, error = query(expr)
            if error or not result:
                empty.append((panel["title"], target.get("legendFormat", ""), error or "no series", expr))

    print(f"\nPanel queries: {checked - len(empty)} of {checked} return data.")
    for title, legend, reason, expr in empty:
        print(f"  EMPTY  {title} [{legend}] - {reason}\n         {expr}")
    return 1 if empty else 0


if __name__ == "__main__":
    sys.exit(main())
