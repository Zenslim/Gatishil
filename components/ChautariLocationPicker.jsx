import { useEffect, useMemo, useState } from "react";

/**
 * ChautariLocationPicker.jsx
 * Progressive disclosure picker for Nepal (Province→District→Palika→Ward→Tole REQUIRED)
 * or Abroad (Country→City REQUIRED).
 *
 * Props:
 *  - supabase: Supabase client (required)
 *  - initialValue: an optional prefilled roots_json-like object
 *  - onChange(value|null): emits null until the REQUIRED final field is present
 *  - disabled: boolean
 */
export default function ChautariLocationPicker({
  supabase,
  initialValue = null,
  onChange = () => {},
  disabled = false,
}) {
  const [abroad, setAbroad] = useState(
    initialValue?.type === "city" ? true : false
  );

  // Nepal states
  const [provinceId, setProvinceId] = useState(initialValue?.province_id ?? "");
  const [districtId, setDistrictId] = useState(initialValue?.district_id ?? "");
  const [localLevelId, setLocalLevelId] = useState(initialValue?.local_level_id ?? "");
  const [wardId, setWardId] = useState(initialValue?.ward_id ?? "");
  const [toleId, setToleId] = useState(initialValue?.tole_id ?? "");
  const [toleText, setToleText] = useState(initialValue?.tole_text ?? "");

  // Abroad states
  const [countryCode, setCountryCode] = useState(initialValue?.country_code ?? "");
  const [cityId, setCityId] = useState(initialValue?.city_id ?? "");
  const [cityText, setCityText] = useState(initialValue?.city_text ?? "");

  // Options
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [localLevels, setLocalLevels] = useState([]);
  const [wards, setWards] = useState([]);
  const [toles, setToles] = useState([]);

  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);

  // Load root options
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!supabase) return;
      const { data: prov, error: provErr } = await supabase.from("provinces").select("id,name").order("id");
      if (provErr) console.error("provinces load error", provErr);
      const { data: ctry, error: cErr } = await supabase.from("countries").select("code,name").order("name");
      if (cErr) console.error("countries load error", cErr);
      if (!ignore) {
        setProvinces(prov ?? []);
        setCountries((ctry ?? []).map((r) => ({ code: r.code, name: r.name })));
      }
    })();
    return () => { ignore = true; };
  }, [supabase]);

  // Fetch cascades for Nepal
  useEffect(() => {
    setDistrictId("");
    setLocalLevelId("");
    setWardId("");
    setToleId("");
    setToleText("");

    if (!provinceId || !supabase) { setDistricts([]); return; }
    let ignore = false;
    (async () => {
      const { data } = await supabase
        .from("districts")
        .select("id,name")
        .eq("province_id", provinceId)
        .order("name");
      if (!ignore) setDistricts(data ?? []);
    })();
    return () => { ignore = true; };
  }, [provinceId, supabase]);

  useEffect(() => {
    setLocalLevelId("");
    setWardId("");
    setToleId("");
    setToleText("");
    if (!districtId || !supabase) { setLocalLevels([]); return; }
    let ignore = false;
    (async () => {
      const { data } = await supabase
        .from("local_levels")
        .select("id,name")
        .eq("district_id", districtId)
        .order("name");
      if (!ignore) setLocalLevels(data ?? []);
    })();
    return () => { ignore = true; };
  }, [districtId, supabase]);

  useEffect(() => {
    setWardId("");
    setToleId("");
    setToleText("");
    if (!localLevelId || !supabase) { setWards([]); return; }
    let ignore = false;
    (async () => {
      const { data } = await supabase
        .from("wards")
        .select("id,ward_no")
        .eq("local_level_id", localLevelId)
        .order("ward_no");
      if (!ignore) setWards(data ?? []);
    })();
    return () => { ignore = true; };
  }, [localLevelId, supabase]);

  useEffect(() => {
    setToleId("");
    setToleText("");
    if (!wardId || !supabase) { setToles([]); return; }
    let ignore = false;
    (async () => {
      const { data } = await supabase
        .from("toles")
        .select("id,name,status")
        .eq("ward_id", wardId)
        .order("name");
      if (!ignore) setToles(data ?? []);
    })();
    return () => { ignore = true; };
  }, [wardId, supabase]);

  // Fetch cascades for Abroad
  useEffect(() => {
    setCityId("");
    setCityText("");
    if (!countryCode || !supabase) { setCities([]); return; }
    let ignore = false;
    (async () => {
      const { data } = await supabase
        .from("cities")
        .select("id,name,status")
        .eq("country_code", countryCode)
        .order("name");
      if (!ignore) setCities(data ?? []);
    })();
    return () => { ignore = true; };
  }, [countryCode, supabase]);

  // Toggle behavior
  const onToggleAbroad = (checked) => {
    setAbroad(checked);
    // Clear both paths appropriately
    setProvinceId(""); setDistrictId(""); setLocalLevelId(""); setWardId(""); setToleId(""); setToleText("");
    setCountryCode(""); setCityId(""); setCityText("");
  };

  // Compose label for summary and payload
  const summaryLabel = useMemo(() => {
    if (abroad) {
      const c = countries.find((x) => (x.code ?? x.name) === countryCode)?.name || "";
      const city = cityId ? (cities.find((x) => x.id === Number(cityId))?.name || "") : cityText;
      return [c, city].filter(Boolean).join(" / ");
    }
    const p = provinces.find((x) => x.id === Number(provinceId))?.name || "";
    const d = districts.find((x) => x.id === Number(districtId))?.name || "";
    const l = localLevels.find((x) => x.id === Number(localLevelId))?.name || "";
    const w = wards.find((x) => x.id === Number(wardId))?.ward_no;
    const t = toleId ? (toles.find((x) => x.id === Number(toleId))?.name || "") : toleText;
    return [p, d, l, w ? `Ward ${w}` : "", t].filter(Boolean).join(" / ");
  }, [
    abroad,
    countryCode, cityId, cityText, countries, cities,
    provinceId, districtId, localLevelId, wardId, toleId, toleText,
    provinces, districts, localLevels, wards, toles
  ]);

  // Emit normalized payload only when final requirement met
  useEffect(() => {
    if (abroad) {
      const hasCity = (cityId && String(cityId).length > 0) || (cityText && cityText.trim().length > 0);
      if (countryCode && hasCity) {
        onChange({
          type: "city",
          country_code: countryCode,
          city_id: cityId ? Number(cityId) : null,
          city_text: cityId ? null : cityText.trim(),
          label: summaryLabel,
        });
      } else {
        onChange(null);
      }
      return;
    }
    // Nepal path
    const hasTole = (toleId && String(toleId).length > 0) || (toleText && toleText.trim().length > 0);
    if (provinceId && districtId && localLevelId && wardId && hasTole) {
      onChange({
        type: "tole",
        province_id: Number(provinceId),
        district_id: Number(districtId),
        local_level_id: Number(localLevelId),
        ward_id: Number(wardId),
        tole_id: toleId ? Number(toleId) : null,
        tole_text: toleId ? null : toleText.trim(),
        label: summaryLabel,
      });
    } else {
      onChange(null);
    }
  }, [
    abroad,
    countryCode, cityId, cityText,
    provinceId, districtId, localLevelId, wardId, toleId, toleText,
    summaryLabel, onChange
  ]);

  // Add-missing handlers
  const handleAddTole = async (name) => {
    if (!name?.trim() || !wardId) return;
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id ?? null;
    const { data, error } = await supabase
      .from("toles")
      .insert({ name: name.trim(), ward_id: Number(wardId), created_by: userId, status: "pending" })
      .select("id");
    if (!error && data && data[0]) {
      setToleId(String(data[0].id));
      setToleText("");
    } else {
      // fall back to text
      setToleId("");
      setToleText(name.trim());
    }
  };

  const handleAddCity = async (name) => {
    if (!name?.trim() || !countryCode) return;
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id ?? null;
    const { data, error } = await supabase
      .from("cities")
      .insert({ name: name.trim(), country_code: countryCode, created_by: userId, status: "pending" })
      .select("id");
    if (!error && data && data[0]) {
      setCityId(String(data[0].id));
      setCityText("");
    } else {
      setCityId("");
      setCityText(name.trim());
    }
  };

  // UI helpers
  const Select = ({ label, value, onChange, children, placeholder }) => (
    <div className="mb-3">
      <label className="block text-sm text-neutral-400 mb-1">{label}</label>
      <select
        className="w-full rounded-lg bg-neutral-900 border border-neutral-700 p-3 text-neutral-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    </div>
  );

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-4">
        <input
          id="toggle-abroad"
          type="checkbox"
          className="h-4 w-4"
          checked={abroad}
          onChange={(e) => onToggleAbroad(e.target.checked)}
          disabled={disabled}
        />
        <label htmlFor="toggle-abroad" className="text-neutral-200 text-sm">
          I live abroad
        </label>
      </div>

      {!abroad ? (
        <div>
          <Select
            label="Province"
            value={provinceId}
            onChange={setProvinceId}
            placeholder="Select Province"
          >
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>

          {provinceId && (
            <Select
              label="District"
              value={districtId}
              onChange={setDistrictId}
              placeholder="Select District"
            >
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          )}

          {districtId && (
            <Select
              label="Palika (Nagar/Gaun)"
              value={localLevelId}
              onChange={setLocalLevelId}
              placeholder="Select Palika"
            >
              {localLevels.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          )}

          {localLevelId && (
            <Select
              label="Ward"
              value={wardId}
              onChange={setWardId}
              placeholder="Select Ward"
            >
              {wards.map((w) => (
                <option key={w.id} value={w.id}>Ward {w.ward_no}</option>
              ))}
            </Select>
          )}

          {wardId && (
            <div className="mb-2">
              <label className="block text-sm text-neutral-400 mb-1">
                Tole <span className="text-red-400">*</span>
              </label>
              <select
                className="w-full rounded-lg bg-neutral-900 border border-neutral-700 p-3 text-neutral-100"
                value={toleId}
                onChange={(e) => {
                  setToleId(e.target.value);
                  setToleText("");
                }}
                disabled={disabled}
              >
                <option value="">Select Tole</option>
                {toles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.status === "pending" ? " ⏳" : ""}
                  </option>
                ))}
              </select>

              <div className="text-xs text-neutral-400 mt-2">
                Can't find it? Type and add:
              </div>
              <div className="flex gap-2 mt-1">
                <input
                  className="flex-1 rounded-lg bg-neutral-900 border border-neutral-700 p-3 text-neutral-100"
                  placeholder="Your Tole name"
                  value={toleText}
                  onChange={(e) => { setToleText(e.target.value); setToleId(""); }}
                  disabled={disabled}
                />
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-100"
                  onClick={() => handleAddTole(toleText)}
                  disabled={!toleText?.trim() || disabled}
                >
                  ➕ Add
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Tole is required. Submissions are marked pending until review.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-3">
            <label className="block text-sm text-neutral-400 mb-1">Country</label>
            <select
              className="w-full rounded-lg bg-neutral-900 border border-neutral-700 p-3 text-neutral-100"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              disabled={disabled}
            >
              <option value="">Select Country</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          {countryCode && (
            <div className="mb-2">
              <label className="block text-sm text-neutral-400 mb-1">
                City <span className="text-red-400">*</span>
              </label>
              <select
                className="w-full rounded-lg bg-neutral-900 border border-neutral-700 p-3 text-neutral-100"
                value={cityId}
                onChange={(e) => { setCityId(e.target.value); setCityText(""); }}
                disabled={disabled}
              >
                <option value="">Select City</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.status === "pending" ? " ⏳" : ""}
                  </option>
                ))}
              </select>

              <div className="text-xs text-neutral-400 mt-2">
                Can't find it? Type and add:
              </div>
              <div className="flex gap-2 mt-1">
                <input
                  className="flex-1 rounded-lg bg-neutral-900 border border-neutral-700 p-3 text-neutral-100"
                  placeholder="Your City name"
                  value={cityText}
                  onChange={(e) => { setCityText(e.target.value); setCityId(""); }}
                  disabled={disabled}
                />
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-100"
                  onClick={() => handleAddCity(cityText)}
                  disabled={!cityText?.trim() || disabled}
                >
                  ➕ Add
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                City is required. Submissions are marked pending until review.
              </p>
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
