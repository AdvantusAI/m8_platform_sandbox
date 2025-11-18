import { useState, useEffect } from "react";

interface FilterState {
  canal: string[];
  marca: string[];
  clientHierarchy: string[];
  umn: string[];
  productLine: string[];
}

interface FilterPanelProps {
  customers?: any[];
  onFiltersChange?: (filters: FilterState) => void;
}

export default function FilterPanel({ customers = [], onFiltersChange }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>({
    canal: [],
    marca: [],
    clientHierarchy: [],
    umn: [],
    productLine: []
  });

  // Generate dynamic customer hierarchy from real data
  const getCustomerHierarchy = () => {
    const uniqueCustomers = [...new Set(customers.map(c => c.customer_name))];
    return uniqueCustomers.length > 0 ? uniqueCustomers : [
      "BC COMERCIO",
      "CENTRAL DE AUTOBUSES", 
      "FARM.BENAVIDES",
      "FARM.GUADALAJARA",
      "FARM.SAN PABLO",
      "KIOSCO",
      "OTRAS TC",
      "OXXO",
      "SEVEN ELEVEN",
      "SUPER IQ",
      "SUPER SMART VERACRUZ",
      "TIOS EXTRA",
      "VIP MARKET"
    ];
  };

  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(filters);
    }
  }, [filters, onFiltersChange]);

  const toggleFilter = (category: keyof FilterState, item: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(item)
        ? prev[category].filter(i => i !== item)
        : [...prev[category], item]
    }));
  };

  const isSelected = (category: keyof FilterState, item: string) => {
    return filters[category].includes(item);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white p-4 rounded-xl grid grid-cols-3 gap-4 shadow-lg border border-gray-200">
      {/* Canal */}
      <div className="bg-blue-900 text-white rounded-lg p-3">
        <p className="font-semibold mb-2">Canal</p>
        <div className="grid grid-cols-2 gap-2 text-blue-900">
          {[
            "Conveniencia",
            "Moderno",
            "Menudero",
            "Tradicional",
            "(en blanco)"
          ].map((item) => (
            <button
              key={item}
              onClick={() => toggleFilter('canal', item)}
              className={`rounded-md px-2 py-1 text-sm transition-all ${
                isSelected('canal', item)
                  ? 'bg-blue-200 text-blue-900 font-semibold'
                  : 'bg-white text-blue-900 hover:bg-blue-50'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Marca */}
      <div className="bg-blue-900 text-white rounded-lg p-3">
        <p className="font-semibold mb-2">Marca</p>
        <div className="flex flex-col gap-2 text-blue-900">
          {["JUMEXITO", "KERMATO", "MIA MINERALIZADA"].map((item) => (
            <button
              key={item}
              onClick={() => toggleFilter('marca', item)}
              className={`rounded-md px-2 py-1 text-sm text-left transition-all ${
                isSelected('marca', item)
                  ? 'bg-blue-200 text-blue-900 font-semibold'
                  : 'bg-white text-blue-900 hover:bg-blue-50'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Jerarquía de Cliente */}
      <div className="bg-blue-900 text-white rounded-lg p-3">
        <p className="font-semibold mb-2">Jerarquía de Cliente</p>
        <div className="flex flex-col gap-2 text-blue-900 max-h-60 overflow-y-auto">
          {getCustomerHierarchy().map((item) => (
            <button
              key={item}
              onClick={() => toggleFilter('clientHierarchy', item)}
              className={`rounded-md px-2 py-1 text-sm text-left transition-all ${
                isSelected('clientHierarchy', item)
                  ? 'bg-blue-200 text-blue-900 font-semibold'
                  : 'bg-white text-blue-900 hover:bg-blue-50'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* UMN */}
      <div className="bg-blue-900 text-white rounded-lg p-3 col-span-1">
        <p className="font-semibold mb-2">UMN</p>
        <div className="grid grid-cols-2 gap-2 text-blue-900">
          {["Canalizado", "Cerrado", "Disp.Bebida", "No Sito"].map((item) => (
            <button
              key={item}
              onClick={() => toggleFilter('umn', item)}
              className={`rounded-md px-2 py-1 text-sm transition-all ${
                isSelected('umn', item)
                  ? 'bg-blue-200 text-blue-900 font-semibold'
                  : 'bg-white text-blue-900 hover:bg-blue-50'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Línea de Producto */}
      <div className="bg-blue-900 text-white rounded-lg p-3 col-span-2">
        <p className="font-semibold mb-2">Línea de Producto</p>
        <div className="grid grid-cols-2 gap-2 text-blue-900">
          {[
            "IMM FRUIT PET 1000 ML",
            "IMM FRUIT PET 2000 ML",
            "IMM FRUIT PET 4000 ML",
            "IMM FRUIT PET 500 ML"
          ].map((item) => (
            <button
              key={item}
              onClick={() => toggleFilter('productLine', item)}
              className={`rounded-md px-2 py-1 text-sm text-left transition-all ${
                isSelected('productLine', item)
                  ? 'bg-blue-200 text-blue-900 font-semibold'
                  : 'bg-white text-blue-900 hover:bg-blue-50'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Summary and Statistics */}
      <div className="col-span-3 mt-4 space-y-3">
        {/* Applied Filters */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters).map(([category, items]) =>
            items.map(item => (
              <span
                key={`${category}-${item}`}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {item}
                <button
                  onClick={() => toggleFilter(category as keyof FilterState, item)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  ×
                </button>
              </span>
            ))
          )}
          {Object.values(filters).some(items => items.length > 0) && (
            <button
              onClick={() => setFilters({ canal: [], marca: [], clientHierarchy: [], umn: [], productLine: [] })}
              className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-gray-200"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Filter Statistics */}
        {Object.values(filters).some(items => items.length > 0) && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="grid grid-cols-4 gap-4 text-sm mb-3">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {customers.length}
                </div>
                <div className="text-gray-600">Clientes</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {filters.marca.length + filters.productLine.length}
                </div>
                <div className="text-gray-600">Productos</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {filters.canal.length + filters.umn.length}
                </div>
                <div className="text-gray-600">Canales</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {Object.values(filters).reduce((sum, items) => sum + items.length, 0)}
                </div>
                <div className="text-gray-600">Total Filtros</div>
              </div>
            </div>
            
            {/* Sample Impact Visualization */}
            <div className="border-t border-gray-300 pt-3">
              <div className="text-xs text-gray-600 mb-2">Impacto en Ventas Estimado:</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-green-100 p-2 rounded text-center">
                  <div className="font-bold text-green-700">+15.2%</div>
                  <div className="text-green-600">Q1 2025</div>
                </div>
                <div className="bg-blue-100 p-2 rounded text-center">
                  <div className="font-bold text-blue-700">+8.7%</div>
                  <div className="text-blue-600">Q2 2025</div>
                </div>
                <div className="bg-orange-100 p-2 rounded text-center">
                  <div className="font-bold text-orange-700">+12.4%</div>
                  <div className="text-orange-600">Total</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
