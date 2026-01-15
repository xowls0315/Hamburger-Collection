interface SourceLinkProps {
  url: string;
  brandName: string;
}

export default function SourceLink({ url, brandName }: SourceLinkProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
    >
      출처 보기 →
    </a>
  );
}
