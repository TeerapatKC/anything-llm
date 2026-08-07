/**
 * Page wrapper that used to render the floating account button in the top-right
 * corner. That button now lives in the sidebar footer (see components/Footer),
 * so this only passes children through.
 *
 * The wrapper div is kept because every private route renders through it and
 * removing a node from that position would change page layout; dropping it is a
 * separate cleanup.
 */
export default function UserMenu({ children }) {
  return <div className="w-auto h-auto">{children}</div>;
}
