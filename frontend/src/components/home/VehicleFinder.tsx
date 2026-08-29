import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Search, CheckCircle2, RotateCcw, ChevronDown, Sparkles } from 'lucide-react';

export interface VehicleSelection {
  brand: string;
  model: string;
  year: string;
  variant: string;
}

const POPULAR_BRANDS: Record<string, { models: Record<string, string[]> }> = {
  Tata: {
    models: {
      Nexon: ['Creative+', 'Fearless', 'Pure', 'Smart+'],
      Harrier: ['Fearless+', 'Adventure+', 'Pure+'],
      Safari: ['Accomplished+', 'Adventure+', 'Pure'],
      Punch: ['Creative', 'Accomplished', 'Adventure', 'Pure'],
      Curvv: ['Accomplished+ A', 'Creative+ S', 'Pure+'],
      Altroz: ['XZ+ O (S)', 'XZ+', 'XT', 'XE'],
      Tiago: ['XZ+', 'XZ', 'XT', 'XE'],
    },
  },
  Mahindra: {
    models: {
      Thar: ['LX 4x4', 'AX Opt', 'Earth Edition'],
      'Scorpio-N': ['Z8L 4x4', 'Z8', 'Z6', 'Z4'],
      XUV700: ['AX7L AWD', 'AX7', 'AX5', 'MX'],
      'XUV 3XO': ['AX7L', 'AX5L', 'MX3', 'MX1'],
      'Thar ROXX': ['AX7L 4x4', 'AX5L', 'MX5', 'MX1'],
      Bolero: ['B6 (O)', 'B6', 'B4'],
    },
  },
  Hyundai: {
    models: {
      Creta: ['SX(O) Turbo', 'SX Tech', 'S(O)', 'EX', 'E'],
      Venue: ['SX(O)', 'SX', 'S(O)', 'E'],
      Verna: ['SX(O) Turbo', 'SX', 'S', 'EX'],
      Exter: ['SX(O) Connect', 'SX', 'S', 'EX'],
      i20: ['Asta(O)', 'Sportz', 'Magna', 'Era'],
      Tucson: ['Signature AWD', 'Platinum'],
    },
  },
  'Maruti Suzuki': {
    models: {
      Swift: ['ZXi+ Dual Tone', 'ZXi', 'VXi', 'LXi'],
      Brezza: ['ZXi+', 'ZXi', 'VXi', 'LXi'],
      GrandVitara: ['Alpha+ Hybrid', 'Zeta+', 'Delta', 'Sigma'],
      Fronx: ['Alpha Turbo', 'Zeta', 'Delta+', 'Sigma'],
      Baleno: ['Alpha', 'Zeta', 'Delta', 'Sigma'],
      Ertiga: ['ZXi+', 'ZXi', 'VXi', 'LXi'],
      Jimny: ['Alpha Dual Tone', 'Zeta'],
    },
  },
  Toyota: {
    models: {
      Fortuner: ['GR-S 4x4', 'Legender 4x4', '4x4 AT', '4x2 MT'],
      InnovaHycross: ['ZX(O) Hybrid', 'VX Hybrid', 'GX'],
      InnovaCrysta: ['ZX', 'VX', 'GX'],
      UrbanCruiserHyryder: ['V Hybrid', 'G Hybrid', 'S', 'E'],
      Hilux: ['High 4x4 AT', 'Std 4x4 MT'],
      Glanza: ['V', 'G', 'S', 'E'],
    },
  },
  Kia: {
    models: {
      Seltos: ['GTX+ S', 'HTX+', 'HTX', 'HTE'],
      Sonet: ['X-Line', 'GTX+', 'HTX', 'HTE'],
      Carens: ['Luxury Plus', 'Prestige Plus', 'Premium'],
      EV6: ['GT-Line AWD', 'GT-Line RWD'],
    },
  },
  Honda: {
    models: {
      City: ['ZX e:HEV', 'ZX', 'VX', 'V'],
      Elevate: ['ZX CVT', 'VX', 'V', 'SV'],
      Amaze: ['VX Elite', 'VX', 'S', 'E'],
    },
  },
  BMW: {
    models: {
      '3 Series': ['M340i xDrive', '330Li M Sport', '320Ld'],
      'X1': ['sDrive18i M Sport', 'sDrive18d'],
      'X5': ['xDrive40i M Sport', 'xDrive30d'],
      '5 Series': ['530Li M Sport', '520d Luxury'],
    },
  },
};

const YEARS = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017'];

interface VehicleFinderProps {
  onVehicleSelect?: (vehicle: VehicleSelection | null) => void;
  className?: string;
}

const VehicleFinder = ({ onVehicleSelect, className = '' }: VehicleFinderProps) => {
  const navigate = useNavigate();

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2024');
  const [variant, setVariant] = useState('');
  const [savedVehicle, setSavedVehicle] = useState<VehicleSelection | null>(null);

  // Load previously saved vehicle if any
  useEffect(() => {
    try {
      const stored = localStorage.getItem('auto_selected_vehicle');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.brand && parsed?.model) {
          setSavedVehicle(parsed);
          setBrand(parsed.brand);
          setModel(parsed.model);
          setYear(parsed.year || '2024');
          setVariant(parsed.variant || '');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const availableModels = brand && POPULAR_BRANDS[brand] ? Object.keys(POPULAR_BRANDS[brand].models) : [];
  const availableVariants =
    brand && model && POPULAR_BRANDS[brand]?.models[model]
      ? POPULAR_BRANDS[brand].models[model]
      : [];

  const handleBrandChange = (newBrand: string) => {
    setBrand(newBrand);
    setModel('');
    setVariant('');
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    setVariant('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand || !model) return;

    const vehicle: VehicleSelection = {
      brand,
      model,
      year: year || '2024',
      variant: variant || (availableVariants[0] ?? 'Standard'),
    };

    localStorage.setItem('auto_selected_vehicle', JSON.stringify(vehicle));
    setSavedVehicle(vehicle);
    if (onVehicleSelect) {
      onVehicleSelect(vehicle);
    }
    // Navigate to collections with query or vehicle context
    navigate(`/collections/all?vehicle=${encodeURIComponent(`${brand} ${model} ${year}`)}`);
  };

  const handleReset = () => {
    localStorage.removeItem('auto_selected_vehicle');
    setSavedVehicle(null);
    setBrand('');
    setModel('');
    setYear('2024');
    setVariant('');
    if (onVehicleSelect) {
      onVehicleSelect(null);
    }
  };

  return (
    <section
      className={`w-full relative rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-white p-5 xs:p-6 sm:p-8 lg:p-10 border border-zinc-800 shadow-2xl overflow-hidden ${className}`}
    >
      {/* Decorative Automotive Grid Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF7A00]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-orange-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8 border-b border-zinc-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#FF7A00]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Precision Compatibility</span>
            </div>
            <h2 className="text-xl xs:text-2xl sm:text-3xl font-extrabold tracking-tight uppercase flex items-center gap-2.5 text-white">
              <Car className="w-7 h-7 text-[#FF7A00]" strokeWidth={2} />
              <span>Find Accessories For Your Car</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-normal">
              Select your vehicle details to unlock guaranteed-fit parts and tailored recommendations.
            </p>
          </div>

          {savedVehicle && (
            <div className="flex items-center gap-2.5 bg-zinc-900/90 border border-zinc-700/80 rounded-2xl px-4 py-2.5 self-start md:self-auto shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                  Active Vehicle
                </span>
                <span className="text-xs font-bold text-white">
                  {savedVehicle.brand} {savedVehicle.model} ({savedVehicle.year})
                </span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                title="Change or clear vehicle"
                className="ml-2 p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Form Selector */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Brand */}
            <div className="relative">
              <label className="block text-[11px] font-bold tracking-wider text-zinc-400 uppercase mb-1.5">
                1. Make / Brand
              </label>
              <div className="relative">
                <select
                  value={brand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full h-12 bg-zinc-900/90 hover:bg-zinc-850 focus:bg-zinc-900 border border-zinc-700/90 focus:border-[#FF7A00] rounded-xl px-4 text-sm font-semibold text-white focus:outline-none transition-all appearance-none cursor-pointer pr-10"
                >
                  <option value="" className="bg-zinc-900 text-zinc-400">Select Brand</option>
                  {Object.keys(POPULAR_BRANDS).map((b) => (
                    <option key={b} value={b} className="bg-zinc-900 text-white">
                      {b}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            {/* 2. Model */}
            <div className="relative">
              <label className="block text-[11px] font-bold tracking-wider text-zinc-400 uppercase mb-1.5">
                2. Model
              </label>
              <div className="relative">
                <select
                  value={model}
                  onChange={(e) => handleModelChange(e.target.value)}
                  disabled={!brand}
                  className="w-full h-12 bg-zinc-900/90 hover:bg-zinc-850 focus:bg-zinc-900 border border-zinc-700/90 focus:border-[#FF7A00] rounded-xl px-4 text-sm font-semibold text-white focus:outline-none transition-all appearance-none cursor-pointer pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="" className="bg-zinc-900 text-zinc-400">
                    {brand ? 'Select Model' : 'Select Brand First'}
                  </option>
                  {availableModels.map((m) => (
                    <option key={m} value={m} className="bg-zinc-900 text-white">
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            {/* 3. Year */}
            <div className="relative">
              <label className="block text-[11px] font-bold tracking-wider text-zinc-400 uppercase mb-1.5">
                3. Year
              </label>
              <div className="relative">
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full h-12 bg-zinc-900/90 hover:bg-zinc-850 focus:bg-zinc-900 border border-zinc-700/90 focus:border-[#FF7A00] rounded-xl px-4 text-sm font-semibold text-white focus:outline-none transition-all appearance-none cursor-pointer pr-10"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="bg-zinc-900 text-white">
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            {/* 4. Variant */}
            <div className="relative">
              <label className="block text-[11px] font-bold tracking-wider text-zinc-400 uppercase mb-1.5">
                4. Trim / Variant
              </label>
              <div className="relative">
                <select
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                  disabled={!model}
                  className="w-full h-12 bg-zinc-900/90 hover:bg-zinc-850 focus:bg-zinc-900 border border-zinc-700/90 focus:border-[#FF7A00] rounded-xl px-4 text-sm font-semibold text-white focus:outline-none transition-all appearance-none cursor-pointer pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="" className="bg-zinc-900 text-zinc-400">
                    {model ? 'All Variants / Specific Trim' : 'Select Model First'}
                  </option>
                  {availableVariants.map((v) => (
                    <option key={v} value={v} className="bg-zinc-900 text-white">
                      {v}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-zinc-400 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span>Over 14,000+ vehicle-verified parts in inventory</span>
            </div>

            <button
              type="submit"
              disabled={!brand || !model}
              className="w-full sm:w-auto px-8 h-12 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FF9E00] hover:from-[#FF9E00] hover:to-[#FF7A00] text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(255,122,0,0.35)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4" strokeWidth={2.5} />
              <span>Show Compatible Products</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export { VehicleFinder };
export default VehicleFinder;
