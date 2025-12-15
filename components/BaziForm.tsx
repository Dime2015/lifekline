
import React, { useState, useMemo, useEffect } from 'react';
import { UserInput, Gender } from '../types';
import { Loader2, Sparkles, TrendingUp, Settings, Calculator, PencilLine, MapPin, Calendar, Clock } from 'lucide-react';
import { calculateBaziSafe } from '../services/baziCalculator';
import { searchCityCoordinates } from '../services/geocodingService';

interface BaziFormProps {
  onSubmit: (data: UserInput) => void;
  isLoading: boolean;
}

const BaziForm: React.FC<BaziFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<UserInput>({
    name: '',
    gender: Gender.MALE,
    birthYear: '',
    yearPillar: '',
    monthPillar: '',
    dayPillar: '',
    hourPillar: '',
    startAge: '',
    firstDaYun: '',
    modelName: 'google/gemini-3-pro-preview',
    apiBaseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
  });

  // New State for Auto Calculation
  const [showAutoForm, setShowAutoForm] = useState(true);
  const [basicInput, setBasicInput] = useState({
    birthDate: '',
    birthTime: '',
    birthPlace: '上海市',
    longitude: '', // Will be populated by effect
    latitude: '',
    timezone: '8', // Default UTC+8
  });

  const [coordsLoading, setCoordsLoading] = useState(false);
  const [tstInfo, setTstInfo] = useState<string>('');

  const handleCityBlur = async () => {
    if (!basicInput.birthPlace) return;
    setCoordsLoading(true);
    setTstInfo('');

    const coords = await searchCityCoordinates(basicInput.birthPlace);
    if (coords) {
      // Estimate timezone based on longitude (15 degrees per hour)
      const estimatedTz = Math.round(coords.lng / 15);

      setBasicInput(prev => ({
        ...prev,
        longitude: coords.lng.toFixed(4),
        latitude: coords.lat.toFixed(4),
        timezone: estimatedTz.toString()
      }));
      setTstInfo(`已定位: ${coords.city} (经度: ${coords.lng.toFixed(2)}, 时区: UTC${estimatedTz >= 0 ? '+' : ''}${estimatedTz})`);
    } else {
      setTstInfo('未找到该地点经纬度，将按平太阳时计算');
    }
    setCoordsLoading(false);
    setCoordsLoading(false);
  };

  useEffect(() => {
    // Trigger search for default value
    if (basicInput.birthPlace) {
      handleCityBlur();
    }
  }, []); // Run once on mount

  // Update gender when formData.gender changes is not needed as they share the same source for Gender if we move it out, 
  // but for now let's keep Gender in formData and sync it or just use formData.gender for both forms.

  const [formErrors, setFormErrors] = useState<{ modelName?: string, apiBaseUrl?: string, apiKey?: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (name === 'apiBaseUrl' || name === 'apiKey' || name === 'modelName') {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBasicInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBasicInput(prev => ({ ...prev, [name]: value }));
  };

  const handleAutoCalculate = () => {
    if (!basicInput.birthDate || !basicInput.birthTime) {
      alert("请输入完整的出生日期和时间");
      return;
    }

    try {
      console.log("Auto Calculation inputs:", basicInput, formData.gender);
      // Ensure we have clean numbers, though generic error catching is fine
      console.log("Auto Calculation inputs:", basicInput, formData.gender);

      const lon = basicInput.longitude ? parseFloat(basicInput.longitude) : undefined;
      const lat = basicInput.latitude ? parseFloat(basicInput.latitude) : undefined;
      const tz = basicInput.timezone ? parseFloat(basicInput.timezone) : 8;

      const result = calculateBaziSafe(
        basicInput.birthDate,
        basicInput.birthTime,
        formData.gender,
        lon,
        lat,
        tz
      );

      const birthYear = basicInput.birthDate.split('-')[0];

      setFormData(prev => ({
        ...prev,
        birthYear: birthYear,
        yearPillar: result.yearPillar,
        monthPillar: result.monthPillar,
        dayPillar: result.dayPillar,
        hourPillar: result.hourPillar,
        startAge: result.startAge,
        firstDaYun: result.firstDaYun,
      }));

      // Switch to manual view for review
      setShowAutoForm(false);
    } catch (e: any) {
      console.error("Calculation Error:", e);
      alert(`计算失败: ${e.message || "未知错误"}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate API Config
    const errors: { modelName?: string, apiBaseUrl?: string, apiKey?: string } = {};
    if (!formData.modelName.trim()) {
      errors.modelName = '请输入模型名称';
    }
    if (!formData.apiBaseUrl.trim()) {
      errors.apiBaseUrl = '请输入 API Base URL';
    }
    if (!formData.apiKey.trim()) {
      errors.apiKey = '请输入 API Key';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    onSubmit(formData);
  };

  // Calculate direction for UI feedback
  const daYunDirectionInfo = useMemo(() => {
    if (!formData.yearPillar) return '等待输入年柱...';

    const firstChar = formData.yearPillar.trim().charAt(0);
    const yangStems = ['甲', '丙', '戊', '庚', '壬'];
    const yinStems = ['乙', '丁', '己', '辛', '癸'];

    let isYangYear = true; // default assume Yang if unknown
    if (yinStems.includes(firstChar)) isYangYear = false;

    let isForward = false;
    if (formData.gender === Gender.MALE) {
      isForward = isYangYear; // Male Yang = Forward, Male Yin = Backward
    } else {
      isForward = !isYangYear; // Female Yin = Forward, Female Yang = Backward
    }

    return isForward ? '顺行 (阳男/阴女)' : '逆行 (阴男/阳女)';
  }, [formData.yearPillar, formData.gender]);

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif-sc font-bold text-gray-800 mb-2">八字排盘</h2>
        <p className="text-gray-500 text-sm">
          {showAutoForm ? '输入出生信息自动排盘' : '确认排盘结果，生成人生K线'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setShowAutoForm(true)}
          className={`flex-1 py-2 rounded-md text-sm font-bold transition flex items-center justify-center gap-2 ${showAutoForm ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <Calculator className="w-4 h-4" />
          快捷排盘
        </button>
        <button
          type="button"
          onClick={() => setShowAutoForm(false)}
          className={`flex-1 py-2 rounded-md text-sm font-bold transition flex items-center justify-center gap-2 ${!showAutoForm ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <PencilLine className="w-4 h-4" />
          专业/手动
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Name & Gender */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名 (可选)</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="姓名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: Gender.MALE })}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${formData.gender === Gender.MALE
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                乾造 (男)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: Gender.FEMALE })}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${formData.gender === Gender.FEMALE
                  ? 'bg-white text-pink-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                坤造 (女)
              </button>
            </div>
          </div>
        </div>

        {/* Auto Calculation Form */}
        {
          showAutoForm && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> 出生日期 (阳历)
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    value={basicInput.birthDate}
                    onChange={handleBasicInputChange}
                    className="w-full px-3 py-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> 出生时间
                  </label>
                  <input
                    type="time"
                    name="birthTime"
                    value={basicInput.birthTime}
                    onChange={handleBasicInputChange}
                    className="w-full px-3 py-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> 出生地点 (城市)
                  </label>
                  <input
                    type="text"
                    name="birthPlace"
                    value={basicInput.birthPlace}
                    onChange={handleBasicInputChange}
                    placeholder="如: 北京市 (用于真太阳时校准)"
                    onBlur={handleCityBlur}
                    className="w-full px-3 py-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  />
                  {coordsLoading && <p className="text-xs text-blue-500 mt-1">正在获取经纬度...</p>}
                  {tstInfo && <p className="text-xs text-gray-500 mt-1">{tstInfo}</p>}
                </div>

                {/* Coords Input (Hidden or Advanced) */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">经度 (Long)</label>
                    <input type="number" step="0.01" name="longitude" value={basicInput.longitude} onChange={handleBasicInputChange} className="w-full px-2 py-2 border rounded-lg text-xs" placeholder="116.40" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">纬度 (Lat)</label>
                    <input type="number" step="0.01" name="latitude" value={basicInput.latitude} onChange={handleBasicInputChange} className="w-full px-2 py-2 border rounded-lg text-xs" placeholder="39.90" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">时区 (UTC)</label>
                    <input type="number" step="0.5" name="timezone" value={basicInput.timezone} onChange={handleBasicInputChange} className="w-full px-2 py-2 border rounded-lg text-xs" placeholder="8" />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAutoCalculate}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Calculator className="w-5 h-5" />
                计算八字排盘
              </button>

              <p className="text-xs text-center text-gray-400 mt-2">
                点击计算后，系统将自动填充至“专业模式”供您核对。
              </p>
            </div>
          )
        }

        {/* Four Pillars Manual Input (Only show in Manual Mode) */}
        {
          !showAutoForm && (
            <>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 animate-fade-in">
                <div className="flex items-center gap-2 mb-3 text-amber-800 text-sm font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>输入四柱干支 (必填)</span>
                </div>

                {/* Birth Year Input - Added as requested */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-600 mb-1">出生年份 (阳历)</label>
                  <input
                    type="number"
                    name="birthYear"
                    required
                    min="1900"
                    max="2100"
                    value={formData.birthYear}
                    onChange={handleChange}
                    placeholder="如: 1990"
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">年柱 (Year)</label>
                    <input
                      type="text"
                      name="yearPillar"
                      required
                      value={formData.yearPillar}
                      onChange={handleChange}
                      placeholder="如: 甲子"
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-center font-serif-sc font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">月柱 (Month)</label>
                    <input
                      type="text"
                      name="monthPillar"
                      required
                      value={formData.monthPillar}
                      onChange={handleChange}
                      placeholder="如: 丙寅"
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-center font-serif-sc font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">日柱 (Day)</label>
                    <input
                      type="text"
                      name="dayPillar"
                      required
                      value={formData.dayPillar}
                      onChange={handleChange}
                      placeholder="如: 戊辰"
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-center font-serif-sc font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">时柱 (Hour)</label>
                    <input
                      type="text"
                      name="hourPillar"
                      required
                      value={formData.hourPillar}
                      onChange={handleChange}
                      placeholder="如: 壬戌"
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-center font-serif-sc font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Da Yun Manual Input */}
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-2 mb-3 text-indigo-800 text-sm font-bold">
                  <TrendingUp className="w-4 h-4" />
                  <span>大运排盘信息 (必填)</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">起运年龄 (周岁/实岁)</label>
                    <input
                      type="number"
                      name="startAge"
                      required
                      min="1"
                      max="100"
                      value={formData.startAge}
                      onChange={handleChange}
                      placeholder="如: 3"
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">第一步大运</label>
                    <input
                      type="text"
                      name="firstDaYun"
                      required
                      value={formData.firstDaYun}
                      onChange={handleChange}
                      placeholder="如: 丁卯"
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-center font-serif-sc font-bold"
                    />
                  </div>
                </div>
                <p className="text-xs text-indigo-600/70 mt-2 text-center">
                  当前大运排序规则：
                  <span className="font-bold text-indigo-900">{daYunDirectionInfo}</span>
                </p>
              </div>
            </>
          )
        }

        {/* API Configuration Section */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-3 text-gray-700 text-sm font-bold">
            <Settings className="w-4 h-4" />
            <span>模型接口设置 (必填)</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">使用模型</label>
              <input
                type="text"
                name="modelName"
                value={formData.modelName}
                onChange={handleChange}
                placeholder="google/gemini-3-pro-preview"
                className={`w-full px-3 py-2 border rounded-lg text-xs font-mono outline-none ${formErrors.modelName ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-gray-400'}`}
              />
              {formErrors.modelName && <p className="text-red-500 text-xs mt-1">{formErrors.modelName}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">API Base URL</label>
              <input
                type="text"
                name="apiBaseUrl"
                value={formData.apiBaseUrl}
                onChange={handleChange}
                placeholder="https://openrouter.ai/api/v1"
                className={`w-full px-3 py-2 border rounded-lg text-xs font-mono outline-none ${formErrors.apiBaseUrl ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-gray-400'}`}
              />
              {formErrors.apiBaseUrl && <p className="text-red-500 text-xs mt-1">{formErrors.apiBaseUrl}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">API Key</label>
              <input
                type="password"
                name="apiKey"
                value={formData.apiKey}
                onChange={handleChange}
                placeholder="sk-..."
                className={`w-full px-3 py-2 border rounded-lg text-xs font-mono outline-none ${formErrors.apiKey ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-gray-400'}`}
              />
              {formErrors.apiKey && <p className="text-red-500 text-xs mt-1">{formErrors.apiKey}</p>}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-indigo-900 to-gray-900 hover:from-black hover:to-black text-white font-bold py-3.5 rounded-xl shadow-lg transform transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5" />
              <span>大师推演中(3-5分钟)</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 text-amber-300" />
              <span>生成人生K线</span>
            </>
          )}
        </button>
      </form >
    </div >
  );
};

export default BaziForm;
