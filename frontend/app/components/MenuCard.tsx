import Link from "next/link";

interface MenuCardProps {
  id: string;
  brandSlug: string;
  name: string;
  imageUrl?: string;
  kcal?: number;
  sodium?: number;
}

export default function MenuCard({
  id,
  brandSlug,
  name,
  imageUrl,
  kcal,
  sodium,
}: MenuCardProps) {
  return (
    <div className="group rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-lg">
      <div className="mb-3 aspect-video w-full rounded-lg bg-gray-200">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            🍔
          </div>
        )}
      </div>
      <h3 className="mb-2 font-semibold text-gray-800">{name}</h3>
      <div className="mb-2 flex gap-4 text-sm text-gray-600">
        {kcal !== undefined && <span>칼로리: {kcal} kcal</span>}
        {sodium !== undefined && <span>나트륨: {sodium} mg</span>}
      </div>
      <Link
        href={`/brand/${brandSlug}/menu/${id}`}
        className="text-sm text-orange-600 hover:underline"
      >
        상세보기 →
      </Link>
    </div>
  );
}
