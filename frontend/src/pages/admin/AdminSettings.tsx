import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Building2, Palette, Upload, Save, Check } from 'lucide-react';
import { apiPut, uploadFile, API_BASE_URL } from '../../lib/api';
import { useOrg, THEMES } from '../../contexts/OrgContext';
import type { OrgSettings } from '../../contexts/OrgContext';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { Navbar } from '../../components/layout/Navbar';
import { BentoCard } from '../../components/ui/BentoCard';

const THEME_META: Record<string, { label: string; emoji: string }> = {
  blue:    { label: 'Синий',    emoji: '🔵' },
  indigo:  { label: 'Индиго',   emoji: '💜' },
  violet:  { label: 'Фиолет',  emoji: '🟣' },
  emerald: { label: 'Изумруд', emoji: '🟢' },
  rose:    { label: 'Розовый',  emoji: '🔴' },
};

export function AdminSettings() {
  const { org, refresh } = useOrg();

  const [name, setName] = useState(org.name);
  const [tagline, setTagline] = useState(org.tagline);
  const [logoUrl, setLogoUrl] = useState(org.logo_url ?? '');
  const [theme, setTheme] = useState(org.theme);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadFile(file);
      setLogoUrl(`${API_BASE_URL}${url}`);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut<OrgSettings>('/api/settings/organization', {
        name: name.trim() || org.name,
        tagline: tagline.trim(),
        logo_url: logoUrl || null,
        theme,
      });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout sidebar={<Sidebar />}>
      <Navbar title="Настройки организации" subtitle="Администратор" />

      <div className="flex-1 overflow-y-auto px-6 pb-20">
        <div className="max-w-3xl mx-auto mt-2 space-y-6">

          {/* Identity block */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <BentoCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-brand-light flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-800 text-base">Идентичность</h2>
                  <p className="text-xs text-slate-400 font-medium">Название и описание организации</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Название организации
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ООО «НордБайт»"
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-medium text-slate-700 transition-all"
                  />
                  <p className="text-xs text-slate-400 font-medium mt-1.5">
                    Отображается в сайдбаре и на странице входа
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Слоган / описание
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Корпоративная платформа обучения"
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-medium text-slate-700 transition-all"
                  />
                </div>
              </div>
            </BentoCard>
          </motion.div>

          {/* Logo block */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <BentoCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-brand-light flex items-center justify-center">
                  <Upload className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-800 text-base">Логотип</h2>
                  <p className="text-xs text-slate-400 font-medium">PNG, SVG или JPG · рекомендуется 512×512</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Preview */}
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center shrink-0 overflow-hidden bg-slate-50">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Логотип" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Settings className="w-8 h-8 text-slate-300" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <div className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white hover:border-brand hover:text-brand text-slate-700 font-bold text-sm transition-all flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      {uploading ? 'Загружаем...' : 'Загрузить логотип'}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>

                  {logoUrl && (
                    <button
                      onClick={() => setLogoUrl('')}
                      className="text-xs text-red-400 hover:text-red-600 font-bold transition-colors"
                    >
                      Удалить логотип
                    </button>
                  )}
                  <p className="text-xs text-slate-400 font-medium">
                    Если логотип не загружен — используется стандартный brandmark
                  </p>
                </div>
              </div>
            </BentoCard>
          </motion.div>

          {/* Theme block */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <BentoCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-brand-light flex items-center justify-center">
                  <Palette className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-800 text-base">Цветовая тема</h2>
                  <p className="text-xs text-slate-400 font-medium">Основной цвет интерфейса</p>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {Object.entries(THEMES).map(([key, colors]) => {
                  const meta = THEME_META[key];
                  const isActive = theme === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setTheme(key)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                        isActive
                          ? 'border-slate-800 bg-slate-50 shadow-md scale-[1.03]'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl shadow-md"
                        style={{ background: `linear-gradient(135deg, ${colors.brand} 0%, ${colors.brandDark} 100%)` }}
                      />
                      <span className="text-xs font-bold text-slate-600">{meta.label}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-slate-700" />}
                    </button>
                  );
                })}
              </div>

              {/* Live preview swatch */}
              <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl shrink-0"
                  style={{ background: THEMES[theme]?.brand ?? THEMES.blue.brand }}
                />
                <div>
                  <p className="text-xs font-bold text-slate-600">Предпросмотр</p>
                  <p className="text-sm font-bold" style={{ color: THEMES[theme]?.brand ?? THEMES.blue.brand }}>
                    {THEME_META[theme]?.label} — {THEMES[theme]?.brand}
                  </p>
                </div>
              </div>
            </BentoCard>
          </motion.div>

          {/* Save */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex justify-end pb-4"
          >
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3.5 bg-brand text-white rounded-2xl font-bold shadow-xl shadow-brand/30 hover:-translate-y-1 transition-all disabled:opacity-60 disabled:translate-y-0 text-sm"
            >
              {saved ? (
                <><Check className="w-4 h-4" /> Сохранено!</>
              ) : saving ? (
                'Сохраняем...'
              ) : (
                <><Save className="w-4 h-4" /> Сохранить изменения</>
              )}
            </button>
          </motion.div>

        </div>
      </div>
    </PageLayout>
  );
}
