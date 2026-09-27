'use client';

import { useState } from 'react';
import { Sliders, Cpu, AlertTriangle, ShieldCheck, RefreshCw, CloudRain, Flame, Wind, Navigation, Clock, TrendingUp } from 'lucide-react';
import { CuratedExperience } from '@/components/CuratedDirectory';

interface DigitalTwinSimulatorProps {
  currentCity?: string;
  selectedStops?: CuratedExperience[];
  onApplyAdaptiveReroute?: (mode: 'indoor' | 'cooler' | 'standard') => void;
}

export function DigitalTwinSimulator({
  currentCity = 'Mumbai',
  selectedStops = [],
  onApplyAdaptiveReroute,
}: DigitalTwinSimulatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rainMm, setRainMm] = useState(0);
  const [temperature, setTemperature] = useState(29);
  const [windSpeed, setWindSpeed] = useState(12);
  const [waterloggingCorridor, setWaterloggingCorridor] = useState(false);

  // Digital Twin Computed Telemetry
  const isExtremeRain = rainMm >= 30;
  const isHeatwave = temperature >= 38;
  const isCycloneRisk = windSpeed >= 45;

  const safetyRiskScore = Math.min(
    100,
    Math.round(
      (rainMm * 1.4) +
      (temperature > 32 ? (temperature - 32) * 5 : 0) +
      (windSpeed > 25 ? (windSpeed - 25) * 1.5 : 0) +
      (waterloggingCorridor ? 25 : 0)
    )
  );

  const transitDelayPercent = Math.min(
    85,
    Math.round((rainMm * 0.8) + (waterloggingCorridor ? 35 : 0) + (windSpeed > 30 ? 15 : 0))
  );

  // Impacted stops count (Outdoor stops vulnerable to rain or high heat)
  const outdoorStops = selectedStops.filter((s) => {
    const title = s.title.toLowerCase();
    const cat = (s.category || '').toUpperCase();
    return (
      cat === 'ADVENTURE' ||
      title.includes('sailing') ||
      title.includes('walk') ||
      title.includes('promenade') ||
      title.includes('trek') ||
      title.includes('market') ||
      title.includes('fort')
    );
  });

  const affectedStopsCount = isExtremeRain || isHeatwave ? outdoorStops.length : 0;

  const resetSimulation = () => {
    setRainMm(0);
    setTemperature(29);
    setWindSpeed(12);
    setWaterloggingCorridor(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#D4CFC0] shadow-sm overflow-hidden mb-6 transition-all">
      {/* Simulation Header Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-[#FAF7F0]/60 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#347F8C]/10 border border-[#347F8C]/30 flex items-center justify-center text-[#347F8C] shrink-0">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-manifold font-bold text-sm sm:text-base text-[#2C2C2C]">
                Digital Twin: What-If Weather & Route Simulator
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#347F8C]/15 text-[#245b64] uppercase tracking-wider">
                Requirement 4
              </span>
            </div>
            <p className="text-xs text-[#2C2C2C]/70 mt-0.5 font-light">
              Stress-test {currentCity} route continuity by shifting precipitation, thermal spikes, and street transit conditions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 font-mono text-xs">
            <span className="text-[#2C2C2C]/60">Risk Index:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-full ${
                safetyRiskScore >= 60
                  ? 'bg-red-100 text-red-800'
                  : safetyRiskScore >= 30
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {safetyRiskScore}%
            </span>
          </div>
          <button
            type="button"
            className="p-2 rounded-xl border border-[#D4CFC0] hover:border-[#347F8C] text-[#2C2C2C] text-xs font-mono font-bold flex items-center gap-1.5 bg-[#FAF7F0]"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isOpen ? 'Close Simulator' : 'Tune Parameters'}</span>
          </button>
        </div>
      </div>

      {/* Expanded Interactive Simulation Canvas */}
      {isOpen && (
        <div className="p-4 sm:p-6 border-t border-[#D4CFC0]/70 bg-[#FAF7F0]/40 space-y-6 animate-in fade-in duration-200">
          {/* Parameter Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Slider 1: Rain Intensity */}
            <div className="bg-white p-4 rounded-xl border border-[#D4CFC0] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-[#2C2C2C] flex items-center gap-1.5">
                  <CloudRain className="w-4 h-4 text-blue-500" />
                  Precipitation Rate
                </span>
                <span className="text-xs font-mono font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {rainMm} mm/hr
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="75"
                step="5"
                value={rainMm}
                onChange={(e) => setRainMm(Number(e.target.value))}
                className="w-full accent-[#347F8C] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#2C2C2C]/50 mt-1">
                <span>0 (Dry)</span>
                <span>25 (Showers)</span>
                <span>50+ (Monsoon Surge)</span>
              </div>
            </div>

            {/* Slider 2: Temperature */}
            <div className="bg-white p-4 rounded-xl border border-[#D4CFC0] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-[#2C2C2C] flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Thermal Index
                </span>
                <span className="text-xs font-mono font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {temperature}°C
                </span>
              </div>
              <input
                type="range"
                min="18"
                max="46"
                step="1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-[#8B7355] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#2C2C2C]/50 mt-1">
                <span>18°C (Pleasant)</span>
                <span>33°C (Warm)</span>
                <span>44°C+ (Heatwave)</span>
              </div>
            </div>

            {/* Slider 3: Wind Velocity & Road Status */}
            <div className="bg-white p-4 rounded-xl border border-[#D4CFC0] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-[#2C2C2C] flex items-center gap-1.5">
                    <Wind className="w-4 h-4 text-teal-600" />
                    Wind Velocity
                  </span>
                  <span className="text-xs font-mono font-extrabold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                    {windSpeed} km/h
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              <label className="flex items-center gap-2 mt-3 pt-2 border-t border-[#D4CFC0]/60 cursor-pointer text-xs font-mono text-[#2C2C2C]">
                <input
                  type="checkbox"
                  checked={waterloggingCorridor}
                  onChange={(e) => setWaterloggingCorridor(e.target.checked)}
                  className="rounded text-[#347F8C] accent-[#347F8C]"
                />
                <span>Simulate low-lying road waterlogging</span>
              </label>
            </div>
          </div>

          {/* Real-Time Digital Twin Response Matrix */}
          <div className="bg-white p-5 rounded-2xl border border-[#D4CFC0] shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-manifold font-bold text-xs uppercase tracking-wider text-[#2C2C2C] flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#347F8C]" />
                Live Digital Twin System Adaptation
              </h4>
              <button
                type="button"
                onClick={resetSimulation}
                className="text-[11px] font-mono text-[#8B7355] hover:text-[#2C2C2C] flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3 h-3" /> Reset to Real-World Forecast
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Telemetry 1: Safety & Risk */}
              <div
                className={`p-3.5 rounded-xl border font-mono ${
                  safetyRiskScore >= 60
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : safetyRiskScore >= 30
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-inherit opacity-80">Route Hazard Metric</div>
                <div className="text-xl font-bold mt-1 flex items-baseline gap-1">
                  <span>{safetyRiskScore}%</span>
                  <span className="text-xs font-normal">
                    {safetyRiskScore >= 60 ? 'High Caution' : safetyRiskScore >= 30 ? 'Moderate Alert' : 'Nominal'}
                  </span>
                </div>
              </div>

              {/* Telemetry 2: Transit Variance */}
              <div className="p-3.5 rounded-xl border border-[#D4CFC0] bg-[#FAF7F0] font-mono text-[#2C2C2C]">
                <div className="text-[10px] uppercase font-bold text-[#8B7355] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Projected Travel Buffer
                </div>
                <div className="text-xl font-bold mt-1">
                  +{transitDelayPercent}% <span className="text-xs font-normal text-[#2C2C2C]/70">transit duration</span>
                </div>
              </div>

              {/* Telemetry 3: Itinerary Impact */}
              <div className="p-3.5 rounded-xl border border-[#D4CFC0] bg-[#FAF7F0] font-mono text-[#2C2C2C]">
                <div className="text-[10px] uppercase font-bold text-[#8B7355] flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> At-Risk Outdoor Stops
                </div>
                <div className="text-xl font-bold mt-1">
                  {affectedStopsCount} / {selectedStops.length}{' '}
                  <span className="text-xs font-normal text-[#2C2C2C]/70">
                    {affectedStopsCount > 0 ? 'need shelter swap' : 'all nominal'}
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic System Action Dispatch */}
            {affectedStopsCount > 0 ? (
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-amber-950 font-manifold block">
                    Digital Twin Triggered Adaptation: {isExtremeRain ? 'Rain-Safe Indoor Swap' : 'Cooling Center Reroute'}
                  </span>
                  <p className="text-amber-900/80 font-light mt-0.5">
                    {outdoorStops.map((s) => s.title).join(', ')} will be redirected to covered heritage arcades, stepwells, or culinary workshops to maintain 100% schedule completion.
                  </p>
                </div>
                {onApplyAdaptiveReroute && (
                  <button
                    type="button"
                    onClick={() => onApplyAdaptiveReroute(isExtremeRain ? 'indoor' : 'cooler')}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold tracking-wide transition shadow-sm shrink-0"
                  >
                    Apply Adaptive Reroute
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Current parameters maintain continuous route feasibility. Zero stops violated by simulated atmospheric envelope.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
