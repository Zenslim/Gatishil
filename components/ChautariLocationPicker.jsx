// components/ChautariLocationPicker.jsx
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/** Remote-only Supabase client (Vercel env) */
const supabase =
  globalThis.__chautari_supabase__ ||
  (globalThis.__chautari_supabase__ = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ));

/** Tiny UI helpers */
function FieldLabel({ children }) {
  return <label className="block text-sm text-neutral-300 mb-1">{children}</label>;
}
function Helper({ children }) {
  return <p className="text-xs text-neutral-400 mt-1">{children}</p>;
}
function Select({ disabled, value, onChange, children }) {
  return (
    <select
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={`w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-400 ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      }`}
    >
      {children}
    </select>
  );
}
function TextInput({ value, onChange, placeholder, list, disabled }) {
  return (
    <input
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      list={list}
      className={`w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-400 ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      }`}
    />
  );
}
function Row({ children }) {
  return <div className="mb-4">{children}</div>;
}

/** Progressive disclosure location picker */
export default function ChautariLocationPicker({ value, onChange }) {
  // Mode
  const [abroad, setAbroad] = useState(false);

  // Nepal selections
  const [province, setProvince] = useState(null);
  const [district, setDistrict] = useState(null);
  const [localLevel, setLocalLevel] = useState(null);
  const [ward, setWard] = useState(null);
  const [toleId, setToleId] = useState(null);
  const [toleText, setToleText] = useState("");

  // Abroad selections
  const [country, setCountry] = useState(null);
  const [cityId, setCityId] = useState(null);
  const [cityText, setCityText] = useState("");

  // Options
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [locals, setLocals] = useState([]);
  const [wards, setWards] = useState([]);
  const [toles, setToles] = useState([]);

  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);

  // Loading flags
  const [loading, setLoading] = useState({
    provinces: false,
    districts: false,
    locals: false,
    wards: false,
    toles: false,
    countries: false,
    cities: false,
    suggest: false,
  });

  /** Load root lists */
  useEffect(() => {
    (async () => {
      setLoading((s) => ({ ...s, provinces: true, countries: true }));
      const [{ data: prov }, { data: ctry }] = await Promise.all([
        supabase.from("provinces").select("id,name").order("name"),
        supabase.from("countries").select("code,name").order("name"),
      ]);
      setProvinces(prov || []);
      setCountries(ctry || []);
      setLoading((s) => ({ ...s, provinces: false, countries: false }));
    })();
  }, []);

  /** Nepal cascades */
  useEffect(() => {
    setDistrict(null);
    setLocalLevel(null);
    setWard(null);
    setToleId(null);
    setToleText("");
    if (!province) return setDistricts([]);
    (async () => {
      setLoading((s) => ({ ...s, districts: true }));
      const { data } = await supabase
        .from("districts")
        .select("id,name")
        .eq("province_id", province)
        .order("name");
      setDistricts(data || []);
      setLoading((s) => ({ ...s, districts: false }));
    })();
  }, [province]);

  useEffect(() => {
    setLocalLevel(null);
    setWard(null);
    setToleId(null);
    setToleText("");
    if (!district) return setLocals([]);
    (async () => {
      setLoading((s) => ({ ...s, locals: true }));
      const { data } = await supabase
        .from("local_levels")
        .select("id,name,kind")
        .eq("district_id", district)
        .order("name");
      setLocals(data || []);
      setLoading((s) => ({ ...s, locals: false }));
    })();
  }, [district]);

  useEffect(() => {
    setWard(null);
    setToleId(null);
    setToleText("");
    if (!localLevel) return setWards([]);
    (async () => {
      setLoading((s) => ({ ...s, wards: true }));
      const { data } = await supabase
        .from("wards")
        .select("id,ward_no")
        .eq("local_level_id", localLevel)
        .order("ward_no", { ascending: true });
      setWards(data || []);
      setLoading((s) => ({ ...s, wards: false }));
    })();
  }, [localLevel]);

  useEffect(() => {
    setToleId(null);
    setToleText("");
    if (!ward) return setToles([]);
    (async () => {
      setLoading((s) => ({ ...s, toles: true }));
      const { data } = await supabase
        .from("toles")
        .select("id,name")
        .eq("ward_id", ward)
        .order("name");
      setToles(data || []);
      setLoading((s) => ({ ...s, toles: false }));
    })();
  }, [ward]);

  /** Abroad cascades */
  useEffect(() => {
    setCityId(null);
    setCityText("");
    if (!country) return setCities([]);
    (async () => {
      setLoading((s) => ({ ...s, cities: true }));
      const { data } = await supabase
        .from("cities")
        .select("id,name")
        .eq("country_code", country)
        .order("name");
      setCities(data || []);
      setLoading((s) => ({ ...s, cities: false }));
    })();
  }, [country]);

  /** Clear opposite path on toggle */
  useEffect(() => {
    if (abroad) {
      setProvince(null);
      setDistrict(null);
      setLocalLevel(null);
      setWard(null);
      setToleId(null);
      setToleText("");
    } else {
      setCountry(null);
      setCityId(null);
      setCityText("");
    }
  }, [abroad]);

  /** Labels */
  const labelNepal = useMemo(() => {
    const p = provinces.find((x) => x.id === province)?.name;
    const d = districts.find((x) => x.id === district)?.name;
    const l = locals.find((x) => x.id === localLevel)?.name;
    const wNo = wards.find((x) => x.id === ward)?.ward_no;
    const tName =
      (toleId && toles.find((x) => x.id === toleId)?.name) || toleText || null;
    return [p, d, l, wNo ? `Ward ${wNo}` : null, tName].filter(Boolean).join(" / ");
  }, [province, district, localLevel, ward, toleId, toleText, provinces, districts, locals, wards, toles]);

  const labelAbroad = useMemo(() => {
    const c = countries.find((x) => x.code === country)?.name;
    const city =
      (cityId && cities.find((x) => x.id === cityId)?.name) || cityText || null;
    return [c, city].filter(Boolean).join(" / ");
  }, [country, cityId, cityText, countries, cities]);

  /** Emit normalized value */
  useEffect(() => {
    if (abroad) {
      if (!country) return onChange?.(null);
      if (cityId || cityText.trim()) {
        onChange?.({
          type: "city",
          id: cityId || null,
          country_code: country,
          label: labelAbroad,
          city_text: cityId ? null : (cityText || "").trim() || null,
        });
      } else {
        onChange?.(null);
      }
      return;
    }
    if (!province || !district || !localLevel || !ward) return onChange?.(null);
    const wardRec = wards.find((w) => w.id === ward);
    onChange?.({
      type: "ward",
      id: ward,
      ward_no: wardRec?.ward_no ?? null,
      local_level_id: localLevel,
      district_id: district,
      province_id: province,
      label: labelNepal,
      tole_id: toleId || null,
      tole_text: toleId ? null : (toleText || "").trim() || null,
    });
  }, [
    abroad,
    province,
    district,
    localLevel,
    ward,
    toleId,
    toleText,
    country,
    cityId,
    cityText,
    labelNepal,
    labelAbroad,
    wards,
    onChange,
  ]);

  /** Suggest Tole/City without direct insert */
  async function suggestLastMile() {
    setLoading((s) => ({ ...s, suggest: true }));
    try {
      if (!abroad) {
        if (!ward || !toleText.trim()) return;
        const { error } = await supabase
          .from("tole_requests")
          .insert({ ward_id: ward, name: toleText.trim() });
        if (error) console.info("tole_requests missing:", error.message);
        alert("✅ Tole request sent for review.");
      } else {
        if (!country || !cityText.trim()) return;
        const { error } = await supabase
          .from("city_requests")
          .insert({ country_code: country, name: cityText.trim() });
        if (error) console.info("city_requests missing:", error.message);
        alert("✅ City request sent for review.");
      }
    } finally {
      setLoading((s) => ({ ...s, suggest: false }));
    }
  }

  /** UI */
  return (
    <div className="w-full">
      {/* Toggle */}
      <Row>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={abroad}
            onChange={(e) => setAbroad(e.target.checked)}
            className="h-4 w-4 accent-amber-400"
          />
          <span className="text-sm text-neutral-200">I live abroad</span>
        </label>
        <Helper>
          {abroad
            ? "For diaspora: choose Country → City."
            : "For Nepal addresses: Province → District → Palika → Ward → (optional) Tole."}
        </Helper>
      </Row>

      {/* ABROAD */}
      {abroad && (
        <>
          <Row>
            <FieldLabel>Country</FieldLabel>
            <Select value={country} onChange={setCountry}>
              <option value="" disabled>
                Select country...
              </option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Helper>{loading.countries ? "Loading countries..." : "Select Country to continue."}</Helper>
          </Row>

          {country && (
            <Row>
              <FieldLabel>
                City <span className="text-neutral-500">(add if missing)</span>
              </FieldLabel>
              <TextInput
                value={cityText}
                onChange={(v) => {
                  setCityText(v);
                  setCityId(null);
                }}
                placeholder="Search or type to add…"
                list="__cities__"
              />
              <datalist id="__cities__">
                {cities.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
              <div className="mt-2 flex gap-2">
                <Select
                  value={cityId}
                  onChange={(v) => {
                    setCityId(v);
                    setCityText("");
                  }}
                >
                  <option value="" disabled>
                    Select existing city… (optional)
                  </option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={suggestLastMile}
                  disabled={!cityText.trim() || loading.suggest}
                  className="shrink-0 rounded-lg bg-amber-400 px-3 text-black text-sm font-medium hover:bg-amber-300 disabled:opacity-60"
                >
                  Add if missing
                </button>
              </div>
              <Helper>
                {loading.cities
                  ? "Loading cities…"
                  : "Pick from the list or type a new city and click “Add if missing.”"}
              </Helper>
            </Row>
          )}
        </>
      )}

      {/* NEPAL */}
      {!abroad && (
        <>
          <Row>
            <FieldLabel>Province</FieldLabel>
            <Select value={province} onChange={setProvince}>
              <option value="" disabled>
                Select province...
              </option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Helper>{loading.provinces ? "Loading provinces..." : "Select Province to continue."}</Helper>
          </Row>

          {province && (
            <Row>
              <FieldLabel>District</FieldLabel>
              <Select value={district} onChange={setDistrict} disabled={!province}>
                <option value="" disabled>
                  {loading.districts ? "Loading…" : "Select district..."}
                </option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
              <Helper>Select District to continue.</Helper>
            </Row>
          )}

          {district && (
            <Row>
              <FieldLabel>Palika (Nagar/Gaun)</FieldLabel>
              <Select value={localLevel} onChange={setLocalLevel} disabled={!district}>
                <option value="" disabled>
                  {loading.locals ? "Loading…" : "Select palika..."}
                </option>
                {locals.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
              <Helper>Select Palika to continue.</Helper>
            </Row>
          )}

          {localLevel && (
            <Row>
              <FieldLabel>Ward</FieldLabel>
              <Select value={ward} onChange={setWard} disabled={!localLevel}>
                <option value="" disabled>
                  {loading.wards ? "Loading…" : "Select ward..."}
                </option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    Ward {w.ward_no}
                  </option>
                ))}
              </Select>
              <Helper>Select Ward to (optionally) provide Tole.</Helper>
            </Row>
          )}

          {ward && (
            <Row>
              <FieldLabel>
                Tole <span className="text-neutral-500">(add if missing)</span>
              </FieldLabel>
              <TextInput
                value={toleText}
                onChange={(v) => {
                  setToleText(v);
                  setToleId(null);
                }}
                placeholder="Search or type to add…"
                list="__toles__"
              />
              <datalist id="__toles__">
                {toles.map((t) => (
                  <option key={t.id} value={t.name} />
                ))}
              </datalist>
              <div className="mt-2 flex gap-2">
                <Select
                  value={toleId}
                  onChange={(v) => {
                    setToleId(v);
                    setToleText("");
                  }}
                >
                  <option value="" disabled>
                    Select existing tole… (optional)
                  </option>
                  {toles.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={suggestLastMile}
                  disabled={!toleText.trim() || loading.suggest}
                  className="shrink-0 rounded-lg bg-amber-400 px-3 text-black text-sm font-medium hover:bg-amber-300 disabled:opacity-60"
                >
                  Add if missing
                </button>
              </div>
              <Helper>
                Choose an existing tole, or type a new one and click “Add if missing.” (Optional.)
              </Helper>
            </Row>
          )}
        </>
      )}

      {/* Live Summary */}
      <div className="mt-4 text-xs text-neutral-400">
        <span className="block">Selected:</span>
        <span className="block mt-1 text-neutral-200">
          {abroad ? labelAbroad || "—" : labelNepal || "—"}
        </span>
      </div>
    </div>
  );
}
