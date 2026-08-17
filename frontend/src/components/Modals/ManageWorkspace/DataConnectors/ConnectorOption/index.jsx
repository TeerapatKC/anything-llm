export default function ConnectorOption({
  slug,
  selectedConnector,
  setSelectedConnector,
  image,
  name,
  description,
}) {
  return (
    <button
      type="button"
      onClick={() => setSelectedConnector(slug)}
      className={`border-none flex text-left gap-x-3 items-center py-2 px-2.5 hover:bg-theme-file-picker-hover ${
        selectedConnector === slug ? "bg-theme-file-picker-hover" : ""
      } rounded-lg cursor-pointer w-full shrink-0`}
    >
      <img
        src={image}
        alt={name}
        className="w-8 h-8 rounded-md shrink-0 object-cover"
      />
      <div className="flex flex-col min-w-0">
        <div className="text-theme-text-primary font-semibold text-sm truncate">
          {name}
        </div>
        <p className="text-xs text-theme-text-secondary truncate">
          {description}
        </p>
      </div>
    </button>
  );
}
