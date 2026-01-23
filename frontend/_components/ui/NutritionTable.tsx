interface NutritionData {
  kcal?: number;
  carbohydrate?: number;
  protein?: number;
  fat?: number;
  sodium?: number;
  sugar?: number;
}

interface NutritionTableProps {
  nutrition: NutritionData;
}

export default function NutritionTable({ nutrition }: NutritionTableProps) {
  const items = [
    { label: "칼로리", value: nutrition.kcal, unit: "kcal" },
    { label: "탄수화물", value: nutrition.carbohydrate, unit: "g" },
    { label: "단백질", value: nutrition.protein, unit: "g" },
    { label: "지방", value: nutrition.fat, unit: "g" },
    { label: "나트륨", value: nutrition.sodium, unit: "mg" },
    { label: "당류", value: nutrition.sugar, unit: "g" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              항목
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
              함량
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.label} className="border-b border-gray-100">
              <td className="px-4 py-3 text-sm text-gray-700">{item.label}</td>
              <td className="px-4 py-3 text-right text-sm text-gray-900">
                {item.value !== undefined
                  ? `${item.value} ${item.unit}`
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
