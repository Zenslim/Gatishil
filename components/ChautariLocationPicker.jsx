"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseClient";

/**
 * ChautariLocationPicker.jsx — Auto-Approve Edition
 * - User-added Tole/City is approved immediately (no blocking)
 * - Weekly/manual review can still happen using the provided SQL view
 */
export default function ChautariLocationPicker({
  supabase: supabaseProp,
  initialValue = null,
  onChange = () => {},
  disabled = false,
}) {
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) {
    supabaseRef.current = supabaseProp ?? getSupabaseBrowser();
  }
  const supabase = supabaseRef.current;

  const [abroad, setAbroad] = useState(initialValue?.type === "city");
  const [provinceId, setProvinceId] = useState(initialValue?.province_id ?? "");
  const [districtId, setDistrictId] = useState(initialValue?.district_id ?? "");
  const [localLevelId, setLocalLevelId] = useState(initialValue?.local_level_id ?? "");
  const [wardId, setWardId] = useState(initialValue?.ward_id ?? "");
  const [toleId, setToleId] = useState(initialValue?.tole_id ?? "");
  const [toleText, setToleText] = useState(initialValue?.tole_text ?? "");
  const [countryCode, setCountryCode] = useState(initialValue?.country_code ?? "");
  const [cityId, setCityId] = useState(initialValue?.city_id ?? "");
  const [cityText, setCityText] = useState(initialValue?.city_text ?? "");

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [localLevels, setLocalLevels] = useState([]);
  const [wards, setWards] = useState([]);
  const [toles, setToles] = useState([]);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!supabase) return;
      const { data: prov } = await supabase.from("provinces").select("id,name").order("id");
      const { data: ctry } = await supabase.from("countries").select("code,name").order("name");
      if (!ignore) {
        setProvinces(prov ?? []);
        setCountries(ctry ?? []);
      }
    })();
    return () => { ignore = true; };
  }, [supabase]);

  useEffect(() => {
    setDistrictId(""); setLocalLevelId(""); setWardId(""); setToleId(""); setToleText("");
    if (!provinceId || !supabase) { setDistricts([]); return; }
    let ignore = false;
    (async () => {
      const { data } = await supabase.from("districts").select("id,name").eq("province_id", provinceId).order("name");
      if (!ignore) setDistricts(data ?? []);
    })();
    return () => { ignore = true; };
  }, [provinceId, supabase]);

  useEffect(() => {
    setLocalLevelId(""); setWardId(""); setToleId(""); setToleText("");
    if (!districtId || !supabase) { setLocalLevels([]); return; }
    let ignore = false;
    (async () => {
      const { data } = await supabase.from("local_levels").select("id,name").eq("district_id", districtId).order("name");
      if (!ignore) setLocalLevels(data ?? []);
    })();
    return () => { ignore = true; };
  }, [districtId, supabase]);

  useEffect(() => {
    setWardId(""); setToleId(""); setToleText("");
    if (!localLevelId || !supabase) { setWards([]); return; }
    let ignore = false;
    (async () => {
      const { data } = await supabase.from("wards").select("id,ward_no").eq("local_level_id", localLevelId).order("ward_no");
      if (!ignore) setWards(data ?? []);
    })();
    return () => { ignore = true; };
  }, [localLevelId, supabase]);

  useEffect(() => {
    setToleId(""); setToleText("");
    if (!wardId || !supabase) { setToles([]); return; }
    let ignore = false;
    (async () => {
      const { data } = await supabase.from("toles").select("id,name").eq("ward_id", wardId).order("name");
      if (!ignore) setToles(data ?? []);
    })();
    return () => { ignore = true; };
  }, [wardId, supabase]);

  useEffect(() => {
    setCityId(""); setCityText("");
    if (!countryCode || !supabase) { setCities([]); return; }
    let ignore = false;
    (async () => {
      const { data } = await supabase.from("cities").select("id,name").eq("country_code", countryCode).order("name");
      if (!ignore) setCities(data ?? []);
    })();
    return () => { ignore = true; };
  }, [countryCode, supabase]);

  const onToggleAbroad = (checked) => {
    setAbroad(checked);
    setProvinceId(""); setDistrictId(""); setLocalLevelId(""); setWardId(""); setToleId(""); setToleText("");
    setCountryCode(""); setCityId(""); setCityText("");
  };

  const summaryLabel = useMemo(() => {
    if (abroad) {
      const c = countries.find((x) => x.code === countryCode)?.name || "";
      const city = cityId ? (cities.find((x) => x.id === Number(cityId))?.name || "") : cityText;
      return [c, city].filter(Boolean).join(" / ");
    }
    const p = provinces.find((x) => x.id === Number(provinceId))?.name || "";
    const d = districts.find((x) => x.id === Number(districtId))?.name || "";
    const l = localLevels.find((x) => x.id === Number(localLevelId))?.name || "";
    const w = wards.find((x) => x.id === Number(wardId))?.ward_no;
    const t = toleId ? (toles.find((x) => x.id === Number(toleId))?.name || "") : toleText;
    return [p, d, l, w ? `Ward ${w}` : "", t].filter(Boolean).join(" / ");
  }, [abroad, countryCode, cityId, cityText, countries, cities, provinceId, districtId, localLevelId, wardId, toleId, toleText, provinces, districts, localLevels, wards, toles]);

  useEffect(() => {
    if (abroad) {
      const hasCity = (cityId && String(cityId).length > 0) || (cityText && cityText.trim().length > 0);
      if (countryCode && hasCity) {
        onChange({ type: "city", country_code: countryCode, city_id: cityId ? Number(cityId) : null, city_text: cityId ? null : cityText.trim(), label: summaryLabel });
      } else onChange(null);
      return;
    }
    const hasTole = (toleId && String(toleId).length > 0) || (toleText && toleText.trim().length > 0);
    if (provinceId && districtId && localLevelId && wardId && hasTole) {
      onChange({ type: "tole", province_id: Number(provinceId), district_id: Number(districtId), local_level_id: Number(localLevelId), ward_id: Number(wardId), tole_id: toleId ? Number(toleId) : null, tole_text: toleId ? null : toleText.trim(), label: summaryLabel });
    } else onChange(null);
  }, [abroad, countryCode, cityId, cityText, provinceId, districtId, localLevelId, wardId, toleId, toleText, summaryLabel, onChange]);

  const handleAddTole = async (name) => {
    if (!supabase) return;
    if (!name?.trim() || !wardId) return;
    const clean = name.trim();
    const { data } = await supabase.from("toles").insert({ name: clean, ward_id: Number(wardId) }).select("id");
    if (data && data[0]) { setToleId(String(data[0].id)); setToleText(""); } else { setToleId(""); setToleText(clean); }
  };
  const handleAddCity = async (name) => {
    if (!supabase) return;
    if (!name?.trim() || !countryCode) return;
    const clean = name.trim();
    const { data } = await supabase.from("cities").insert({ name: clean, country_code: countryCode }).select("id");
    if (data && data[0]) { setCityId(String(data[0].id)); setCityText(""); } else { setCityId(""); setCityText(clean); }
  };

  const Select = ({ label, value, onChange, children, placeholder }) => (
    <div className="mb-3">
      <label className="block text-sm text-neutral-400 mb-1">{label}</label>
      <select className="w-full rounded-lg bg-neutral-900 border border-neutral-700 p-3 text-neutral-100" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">{placeholder}</option>
        {children}
      </select>
    </div>
  );

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-4">
        <input id="toggle-abroad" type="checkbox" className="h-4 w-4" checked={abroad} onChange={(e) => onToggleAbroad(e.target.checked)} disabled={disabled} />
        <label htmlFor="toggle-abroad" className="text-neutral-200 text-sm">I live abroad</label>
      </div>

      {!abroad ? (
        <div>
          <Select label="Province" value={provinceId} onChange={setProvinceId} placeholder="Select Province">
            {provinces.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </Select>

          {provinceId && (
            <Select label="District" value={districtId} onChange={setDistrictId} placeholder="Select District">
              {districts.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </Select>
          )}

          {districtId && (
            <Select label="Palika (Nagar/Gaun)" value={localLevelId} onChange={setLocalLevelId} placeholder="Select Palika">
              {localLevels.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
            </Select>
          )}

          {localLevelId && (
            <Select label="Ward" value={wardId} onChange={setWardId} placeholder="Select Ward">
              {wards.map((w) => (<option key={w.id} value={w.id}>Ward {w.ward_no}</option>))}
            </Select>
          )}

          {wardId && (
            <div className="mb-2">
              <label className="block text-sm text-neutral-400 mb-1">Tole <span className="text-red-400">*</span></label>
              <select className="w-full rounded-lg bg-neutral-900 border border-neutral-700 p-3 text-neutral-100" value={toleId} onChange={(e) => { setToleId(e.target.value); setToleText(""); }} disabled={disabled}>
                <option value="">Select Tole</option>
                {toles.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
              </select>

              <div className="text-xs text-neutral-400 mt-2">Can't find it? Type and add:</div>
              <div className="flex gap-2 mt-1">
                <input className="flex-1 rounded-lg bg-neutral-900 border border-neutral-700 p-3 text-neutral-100" placeholder="Your Tole name" value={toleText} onChange={(e) => { setToleText(e.target.value); setToleId(""); }} disabled={disabled} />
                <button type="button" className="px-3 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-100" onClick={() => handleAddTole(toleText)} disabled={!toleText?.trim() || disabled}>➕ Add</button>
              </div>
              <p className="text-xs text-neutral-500 mt-1">Tole is required.</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-3">
            <label className="block text-sm text-neutral-400 mb-1">Country</label>
            <select className="w-full rounded-lg bg-neutral-900 border border-neutral-700 p-3 text-neutral-100" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} disabled={disabled}>
              <option value="">Select Country</option>
              {countries.map((c) => (<option key={c.code} value={c.code}>{c.name}</option>))}
            </select>
          </div>

          {countryCode && (
            <div className="mb-2">
              <label className="block text-sm text-neutral-400 mb-1">City <span className="text-red-400">*</span></label>
              <select className="w-full rounded-lg bg-neutral-900 border border-neutral-700 p-3 text-neutral-100" value={cityId} onChange={(e) => { setCityId(e.target.value); setCityText(""); }} disabled={disabled}>
                <option value="">Select City</option>
                {cities.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>

              <div className="text-xs text-neutral-400 mt-2">Can't find it? Type and add:</div>
              <div className="flex gap-2 mt-1">
                <input className="flex-1 rounded-lg bg-neutral-900 border border-neutral-700 p-3 text-neutral-100" placeholder="Your City name" value={cityText} onChange={(e) => { setCityText(e.target.value); setCityId(""); }} disabled={disabled} />
                <button type="button" className="px-3 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-100" onClick={() => handleAddCity(cityText)} disabled={!cityText?.trim() || disabled}>➕ Add</button>
              </div>
              <p className="text-xs text-neutral-500 mt-1">City is required.</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-sm text-neutral-400 italic">
        {summaryLabel ? `Summary: ${summaryLabel}` : "Start above — we’ll build your path step by step."}
      </div>
    </div>
  );
}
