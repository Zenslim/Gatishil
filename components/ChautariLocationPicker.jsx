"use client";

/**
 * ChautariLocationPicker.jsx
 * Remote-only (GitHub + Vercel + Supabase).
 *
 * What you get:
 * - Nepal cascade: Province → District → Palika (local_level) → Ward → Tole
 * - Diaspora toggle: Country → City
 * - Searchable selects with "Add if missing"
 * - Emits a single normalized value via onChange():
 *   - Nepal (ward path):
 *     {
 *       type: "ward",
 *       id: <ward_id>,
 *       ward_no,
 *       local_level_id,
 *       district_id,
 *       province_id,
 *       label: "Province / District / Palika / Ward <n> / Tole"
 *     }
 *   - Diaspora (city path):
 *     {
 *       type: "city",
 *       id: <city_id>,
 *       city_id: <city_id>,
 *       country_code,
 *       label: "Country / City"
 *     }
 *
 * Supabase tables expected (public schema, camel/underscore ok):
 *   provinces(id, name)
 *   districts(id, province_id, name)
 *   local_levels(id, district_id, name, kind)      -- kind: 'Nagar' | 'Gaun' | etc.
 *   wards(id, local_level_id, ward_no)
 *   toles(id, ward_id, name)
 *   countries(code, name)                           -- ISO code in 'code'
 *   cities(id, country_code, name)
 *
 * All reads are anon; inserts require RLS policies allowing authenticated users to insert.
 * Make sure storage/env are already set (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ChautariLocationPicker({ value, onChange }) {
  // Mode
  const [abroad, setAbroad] = useState(
    value?.type === "city" ? true : false
  );

  // Nepal path selections
  const [provinceId, setProvinceId] = useState(value?.province_id || "");
  const [districtId, setDistrictId] = useState(value?.district_id || "");
  const [localLevelId, setLocalLevelId] = useState(value?.local_level_id || "");
  const [wardId, setWardId] = useState(value?.id && value?.type === "ward" ? value.id : "");
  const [toleId, setToleId] = useState("");

  // Nepal lists (filtered)
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [locals, setLocals] = useState([]);
  const [wards, setWards] = useState([]);
  const [toles, setToles] = useState([]);

  // Search terms
  const [districtQuery, setDistrictQuery] = useState("");
  const [localQuery, setLocalQuery] = useState("");
  const [toleQuery, setToleQuery] = useState("");

  // Diaspora selections + lists
  const [countryCode, setCountryCode] = useState(
    value?.country_code || ""
  );
  const [cityId, setCityId] = useState(
    value?.type === "city" ? (value?.city_id || value?.id || "") : ""
  );
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [countryQuery, setCountryQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");

  const loadingRef = useRef({});

  // ---------- Helpers ----------
  function busy(key, v) {
    loadingRef.current[key] = v;
  }

  function isBusy() {
    return Object.values(loadingRef.current).some(Boolean);
  }

  function labelNepal(p, d, l, w, t) {
    const parts = [p?.name, d?.name, l ? `${l.name}` : null, w ? `Ward ${w.ward_no}` : null, t?.name];
    return parts.filter(Boolean).join(" / ");
  }
  function labelDiaspora(c, city) {
    return [c?.name, city?.name].filter(Boolean).join(" / ");
  }

  // ---------- Loaders ----------
  useEffect(() => {
    (async () => {
      busy("provinces", true);
      const { data } = await supabase.from("provinces").select("id,name").order("name");
      setProvinces(data || []);
      busy("provinces", false);
    })();
  }, []);

  useEffect(() => {
    if (!provinceId) {
      setDistricts([]);
      setDistrictId("");
      return;
    }
    (async () => {
      busy("districts", true);
      let q = supabase.from("districts").select("id,name").eq("province_id", provinceId);
      if (districtQuery.trim()) q = q.ilike("name", `%${districtQuery.trim()}%`);
      const { data } = await q.order("name");
      setDistricts(data || []);
      busy("districts", false);
    })();
  }, [provinceId, districtQuery]);

  useEffect(() => {
    if (!districtId) {
      setLocals([]);
      setLocalLevelId("");
      return;
    }
    (async () => {
      busy("locals", true);
      let q = supabase.from("local_levels").select("id,name,kind").eq("district_id", districtId);
      if (localQuery.trim()) q = q.ilike("name", `%${localQuery.trim()}%`);
      const { data } = await q.order("name");
      setLocals(data || []);
      busy("locals", false);
    })();
  }, [districtId, localQuery]);

  useEffect(() => {
    if (!localLevelId) {
      setWards([]);
      setWardId("");
      return;
    }
    (async () => {
      busy("wards", true);
      const { data } = await supabase
        .from("wards")
        .select("id,ward_no")
        .eq("local_level_id", localLevelId)
        .order("ward_no", { ascending: true });
      setWards(data || []);
      busy("wards", false);
    })();
  }, [localLevelId]);

  useEffect(() => {
    if (!wardId) {
      setToles([]);
      setToleId("");
      return;
    }
    (async () => {
      busy("toles", true);
      let q = supabase.from("toles").select("id,name").eq("ward_id", wardId);
      if (toleQuery.trim()) q = q.ilike("name", `%${toleQuery.trim()}%`);
      const { data } = await q.order("name");
      setToles(data || []);
      busy("toles", false);
    })();
  }, [wardId, toleQuery]);

  // Diaspora lists
  useEffect(() => {
    if (!abroad) return;
    (async () => {
      busy("countries", true);
      let q = supabase.from("countries").select("code,name");
      if (countryQuery.trim()) q = q.ilike("name", `%${countryQuery.trim()}%`);
      const { data } = await q.order("name");
      setCountries(data || []);
      busy("countries", false);
    })();
  }, [abroad, countryQuery]);

  useEffect(() => {
    if (!abroad || !countryCode) {
      setCities([]);
      setCityId("");
      return;
    }
    (async () => {
      busy("cities", true);
      let q = supabase.from("cities").select("id,name,country_code").eq("country_code", countryCode);
      if (cityQuery.trim()) q = q.ilike("name", `%${cityQuery.trim()}%`);
      const { data } = await q.order("name");
      setCities(data || []);
      busy("cities", false);
    })();
  }, [abroad, countryCode, cityQuery]);

  // ---------- Emit normalized value ----------
  const selectedProvince = useMemo(
    () => provinces.find((p) => String(p.id) === String(provinceId)),
    [provinces, provinceId]
  );
  const selectedDistrict = useMemo(
    () => districts.find((d) => String(d.id) === String(districtId)),
    [districts, districtId]
  );
  const selectedLocal = useMemo(
    () => locals.find((l) => String(l.id) === String(localLevelId)),
    [locals, localLevelId]
  );
  const selectedWard = useMemo(
    () => wards.find((w) => String(w.id) === String(wardId)),
    [wards, wardId]
  );
  const selectedTole = useMemo(
    () => toles.find((t) => String(t.id) === String(toleId)),
    [toles, toleId]
  );

  const selectedCountry = useMemo(
    () => countries.find((c) => c.code === countryCode),
    [countries, countryCode]
  );
  const selectedCity = useMemo(
    () => cities.find((c) => String(c.id) === String(cityId)),
    [cities, cityId]
  );

  useEffect(() => {
    if (!onChange) return;
    if (abroad) {
      if (selectedCountry && selectedCity) {
        onChange({
          type: "city",
          id: selectedCity.id,
          city_id: selectedCity.id,
          country_code: selectedCountry.code,
          label: labelDiaspora(selectedCountry, selectedCity),
        });
      } else {
        onChange(null);
      }
      return;
    }
    // Nepal path
    if (selectedProvince && selectedDistrict && selectedLocal && selectedWard) {
      const label = labelNepal(
        selectedProvince,
        selectedDistrict,
        selectedLocal,
        selectedWard,
        selectedTole
      );
      onChange({
        type: "ward",
        id: selectedWard.id,
        ward_no: selectedWard.ward_no,
        local_level_id: selectedLocal.id,
        district_id: selectedDistrict.id,
        province_id: selectedProvince.id,
        label,
        ...(selectedTole ? { tole_id: selectedTole.id, tole_name: selectedTole.name } : {}),
      });
    } else {
      onChange(null);
    }
  }, [
    abroad,
    selectedProvince,
    selectedDistrict,
    selectedLocal,
    selectedWard,
    selectedTole,
    selectedCountry,
    selectedCity,
    onChange,
  ]);

  // ---------- Add-if-missing flows ----------
  async function addToleIfMissing(name) {
    if (!name?.trim() || !wardId) return;
    const pretty = name.trim().replace(/\s+/g, " ");
    const exists = toles.find((t) => t.name.toLowerCase() === pretty.toLowerCase());
    if (exists) {
      setToleId(exists.id);
      return exists.id;
    }
    const { data, error } = await supabase
      .from("toles")
      .insert({ ward_id: wardId, name: pretty })
      .select("id,name")
      .single();
    if (!error && data) {
      setToles((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setToleId(data.id);
      return data.id;
    }
    alert(error?.message || "Could not add Tole");
  }

  async function addCityIfMissing(name) {
    if (!name?.trim() || !countryCode) return;
    const pretty = name.trim().replace(/\s+/g, " ");
    const exists = cities.find((c) => c.name.toLowerCase() === pretty.toLowerCase());
    if (exists) {
      setCityId(exists.id);
      return exists.id;
    }
    const { data, error } = await supabase
      .from("cities")
      .insert({ country_code: countryCode, name: pretty })
      .select("id,name,country_code")
      .single();
    if (!error && data) {
      setCities((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setCityId(data.id);
      return data.id;
    }
    alert(error?.message || "Could not add City");
  }

  // ---------- UI ----------
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={abroad}
            onChange={(e) => {
              setAbroad(e.target.checked);
              // Reset both trees when toggling
              setProvinceId(""); setDistrictId(""); setLocalLevelId(""); setWardId(""); setToleId(""); setToleQuery("");
              setCountryCode(""); setCityId(""); setCountryQuery(""); setCityQuery("");
            }}
          />
          I live abroad
        </label>
        {isBusy() ? <span className="text-xs text-amber-300">Loading…</span> : null}
      </div>

      {!abroad ? (
        <div className="space-y-3">
          {/* Province */}
          <div className="grid gap-1">
            <label className="text-sm text-slate-300">Province</label>
            <select
              className="rounded-lg border border-white/20 bg-black/30 p-2"
              value={provinceId}
              onChange={(e) => {
                setProvinceId(e.target.value);
                setDistrictId("");
                setLocalLevelId("");
                setWardId("");
                setToleId("");
              }}
            >
              <option value="">Select Province…</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* District */}
          <div className="grid gap-1">
            <label className="text-sm text-slate-300">District</label>
            <input
              className="rounded-lg border border-white/20 bg-black/30 p-2"
              placeholder="Search district…"
              value={districtQuery}
              onChange={(e) => setDistrictQuery(e.target.value)}
            />
            <select
              className="rounded-lg border border-white/20 bg-black/30 p-2"
              value={districtId}
              onChange={(e) => {
                setDistrictId(e.target.value);
                setLocalLevelId("");
                setWardId("");
                setToleId("");
              }}
            >
              <option value="">Select District…</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Palika */}
          <div className="grid gap-1">
            <label className="text-sm text-slate-300">Palika (Nagar/Gaun)</label>
            <input
              className="rounded-lg border border-white/20 bg-black/30 p-2"
              placeholder="Search palika…"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
            />
            <select
              className="rounded-lg border border-white/20 bg-black/30 p-2"
              value={localLevelId}
              onChange={(e) => {
                setLocalLevelId(e.target.value);
                setWardId("");
                setToleId("");
              }}
            >
              <option value="">Select Palika…</option>
              {locals.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}{l.kind ? ` (${l.kind})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Ward */}
          <div className="grid gap-1">
            <label className="text-sm text-slate-300">Ward</label>
            <select
              className="rounded-lg border border-white/20 bg-black/30 p-2"
              value={wardId}
              onChange={(e) => {
                setWardId(e.target.value);
                setToleId("");
              }}
            >
              <option value="">Select Ward…</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>Ward {w.ward_no}</option>
              ))}
            </select>
          </div>

          {/* Tole */}
          <div className="grid gap-1">
            <label className="text-sm text-slate-300">Tole (add if missing)</label>
            <input
              className="rounded-lg border border-white/20 bg-black/30 p-2"
              placeholder="Search or type to add…"
              value={toleQuery}
              onChange={(e) => setToleQuery(e.target.value)}
              disabled={!wardId}
            />
            <select
              className="rounded-lg border border-white/20 bg-black/30 p-2"
              value={toleId}
              onChange={(e) => setToleId(e.target.value)}
              disabled={!wardId}
            >
              <option value="">{wardId ? "Select Tole… (optional)" : "Select Ward first"}</option>
              {toles.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {!!toleQuery.trim() && wardId ? (
              <button
                type="button"
                onClick={() => addToleIfMissing(toleQuery)}
                className="justify-self-start rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-sm"
              >
                ➕ Add “{toleQuery.trim()}”
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Country */}
          <div className="grid gap-1">
            <label className="text-sm text-slate-300">Country</label>
            <input
              className="rounded-lg border border-white/20 bg-black/30 p-2"
              placeholder="Search country…"
              value={countryQuery}
              onChange={(e) => setCountryQuery(e.target.value)}
            />
            <select
              className="rounded-lg border border-white/20 bg-black/30 p-2"
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value);
                setCityId("");
              }}
            >
              <option value="">Select Country…</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* City */}
          <div className="grid gap-1">
            <label className="text-sm text-slate-300">City (add if missing)</label>
            <input
              className="rounded-lg border border-white/20 bg-black/30 p-2"
              placeholder="Search or type to add…"
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              disabled={!countryCode}
            />
            <select
              className="rounded-lg border border-white/20 bg-black/30 p-2"
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              disabled={!countryCode}
            >
              <option value="">{countryCode ? "Select City…" : "Select Country first"}</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {!!cityQuery.trim() && countryCode ? (
              <button
                type="button"
                onClick={() => addCityIfMissing(cityQuery)}
                className="justify-self-start rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-sm"
              >
                ➕ Add “{cityQuery.trim()}”
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
