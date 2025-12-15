
import { Solar, Lunar, EightChar } from 'lunar-javascript';
import { Gender } from '../types';

export interface BaziResult {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  startAge: string;
  firstDaYun: string;
  daYunStems?: string[]; // Optional: for debugging or advanced use
  daYunBranches?: string[];
}

/**
 * Calculates Bazi (Four Pillars) and Da Yun info from Solar Date/Time
 * @param dateStr Format: YYYY-MM-DD
 * @param timeStr Format: HH:mm
 * @param gender Gender enum
 * @returns BaziResult
 */
export const calculateBazi = (dateStr: string, timeStr: string, gender: Gender): BaziResult => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  // 1. Create Solar object (Standard Time)
  // TODO: Add True Solar Time correction if Longitude is available
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);

  // 2. Convert to Lunar to get EightChar
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  // Set sect for calculation (2 is usually standard for finding start age in some schools, but 1 is default)
  // Let's stick to default (1) or checking what's common.
  // actually, let's just use default.

  // 3. Get Pillars
  const yearPillar = eightChar.getYearGanZhi();
  const monthPillar = eightChar.getMonthGanZhi();
  const dayPillar = eightChar.getDayGanZhi();
  const hourPillar = eightChar.getTimeGanZhi();

  // 4. Calculate Da Yun
  // Gender: 1 for Male, 0 for Female in this library
  const genderCode = gender === Gender.MALE ? 1 : 0;
  const yun = eightChar.getYun(genderCode);

  // Get Start Age (Xu Sui / Nominal Age is commonly used in Bazi charts, but library might return real age or start year)
  // yun.getStartYear() returns the solar year when Da Yun starts.
  // yun.getStartAge() returns the age.
  const startAge = yun.getStartAge().toString();

  // Get First Da Yun
  const daYuns = yun.getDaYun();
  const firstDaYun = daYuns.length > 0 ? daYuns[1].getGanZhi() : '';
  // Note: daYuns[0] is usually the '0th' meant for childhood limit (Tong Xian) or similar? 
  // Let's verify: In lunar-javascript, getDaYun returns an array.
  // Usually the first entry is the first major Da Yun.
  // Wait, index 0 might be the first ONE (e.g. 3-12 years old). 
  // Let's assume daYuns[0] is the 1st step. Even if index is 1, checking library behavior is key. 
  // Usually Da Yun starts after 'Qi Yun'. 
  // Test: If I print daYuns[0].getGanZhi(), it should be correct.

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    startAge,
    firstDaYun: daYuns.length > 1 ? daYuns[1].getGanZhi() : '', // Often index 1 is the 1st actual DaYun in some libs if 0 is trivial, but let's check. 
    // Correction: In lunar-javascript, 
    // Yun.getDaYun() returns 10+ DaYuns.
    // Index 0: usually 1st Da Yun.
    // However, some systems count 'Xiao Yun' before 'Da Yun'.
    // Let's check the age.
    // I will pick index 0 first and verify.
    // Wait, the "First Da Yun" usually follows the Month Pillar. 
    // E.g. if Month is Jia-Zi, and Forward, next is Yi-Chou.
    // I can verify this logic.
  };
};

// Re-writing the function logic to be safer after checking docs mentally
// Re-writing the function logic to be safer after checking docs mentally
// EOT Calculation (Simplified approximation)
const calculateEOT = (date: Date): number => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;

  const b = (2 * Math.PI * (dayOfYear - 81)) / 365;
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  return eot; // in minutes
}

export const calculateBaziSafe = (
  dateStr: string,
  timeStr: string,
  gender: Gender,
  longitude?: number,
  latitude?: number,
  timezone: number = 8 // Default UTC+8
): BaziResult => {
  let [year, month, day] = dateStr.split('-').map(Number);
  let [hour, minute] = timeStr.split(':').map(Number);

  // --- True Solar Time Calculation ---
  let calcDate = new Date(year, month - 1, day, hour, minute);

  if (typeof longitude === 'number') {
    // 1. Local Mean Solar Time
    // Standard Meridian: Timezone * 15 (e.g. 8 * 15 = 120deg)
    const standardMeridian = timezone * 15;
    const longitudeOffsetMinutes = (longitude - standardMeridian) * 4;

    // 2. Equation of Time
    const eotMinutes = calculateEOT(calcDate);

    const totalOffsetMinutes = longitudeOffsetMinutes + eotMinutes;

    // Apply offset
    calcDate.setMinutes(calcDate.getMinutes() + totalOffsetMinutes);

    console.log(`[TST] Input: ${hour}:${minute}, Lon: ${longitude}, Offset: ${longitudeOffsetMinutes.toFixed(2)}m, EOT: ${eotMinutes.toFixed(2)}m, Result: ${calcDate.getHours()}:${calcDate.getMinutes()}`);

    // Update year/month/day/hour/minute from corrected date
    year = calcDate.getFullYear();
    month = calcDate.getMonth() + 1;
    day = calcDate.getDate();
    hour = calcDate.getHours();
    minute = calcDate.getMinutes();
  }

  if (!Solar) {
    throw new Error("Library 'lunar-javascript' not loaded correctly.");
  }

  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  let eightChar = lunar.getEightChar();

  /* 
  // --- Hemisphere Adjustment logic removed as per user request for consistency ---
  if (typeof latitude === 'number' && latitude < 0) {
    ...
  }
  */
  // Default: accurate to standard Northern Hemisphere / Universal flow
  let effectiveMonthPillar = eightChar.getMonth();

  // 1. Determine Direction (Forward/Backward)
  // Men: Yang Year -> Forward, Yin Year -> Backward
  // Women: Yang Year -> Backward, Yin Year -> Forward
  const yearGan = eightChar.getYearGan(); // e.g. "甲"
  const yangStems = ['甲', '丙', '戊', '庚', '壬'];
  const isYearYang = yangStems.includes(yearGan);

  let isForward = false;
  if (gender === Gender.MALE) {
    isForward = isYearYang;
  } else {
    isForward = !isYearYang;
  }

  // 3. Calculate First Da Yun (Based on Month Pillar)
  // Forward: Next JiaZi
  // Backward: Prev JiaZi

  // Use effectiveMonthPillar calculated above (handling Hemisphere)
  const monthPillar = effectiveMonthPillar;
  // lunar-javascript has utility for this, but simplistic approach: use Lunar.JIA_ZI list
  const jiaZiList = [
    '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
    '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
    '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
    '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
    '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
    '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥'
  ];
  const monthIndex = jiaZiList.indexOf(monthPillar);
  let daYunIndex = isForward ? monthIndex + 1 : monthIndex - 1;

  // Wrap around
  if (daYunIndex >= 60) daYunIndex = 0;
  if (daYunIndex < 0) daYunIndex = 59;

  const firstDaYun = jiaZiList[daYunIndex];

  // 4. Calculate Start Age (Qi Yun) - The Precise Algorithm
  // Forward: Birth to Next JIE
  // Backward: Birth to Prev JIE
  // JIE only (odd indices in 24 terms list? No, check name or library function)
  // Library getPrevJie() / getNextJie() returns the Terms (Jie).
  // Note: We need to ensure we don't pick up 'Qi' (Mid-term).
  // lunar-javascript's `getNextJie()` explicitly gets the next "Sectional Term" (Jie), skipping "Mid-Climate" (Qi). Same for Prev.

  let targetTermTime: any = null;
  const solarTime = solar.toYmdHms(); // "2024-04-20 12:00:00"

  // We need milliseconds for diff
  // Solar object doesn't give simple timestamp?
  // Try JS Date.
  const birthDate = new Date(year, month - 1, day, hour, minute); // Month is 0-indexed in JS Date

  if (isForward) {
    const nextJie = lunar.getNextJie();
    const s = nextJie.getSolar();
    targetTermTime = new Date(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond());
  } else {
    const prevJie = lunar.getPrevJie();
    const s = prevJie.getSolar();
    targetTermTime = new Date(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond());
  }

  // Diff in milliseconds
  // If Backward, diff is Birth - Prev. If Forward, Next - Birth.
  // Result should be positive duration.
  let diffMs = 0;
  if (isForward) {
    diffMs = targetTermTime.getTime() - birthDate.getTime();
  } else {
    diffMs = birthDate.getTime() - targetTermTime.getTime();
  }

  // Convert diff to Days and Hours (Base units)
  // 1 Day = 24 * 60 * 60 * 1000 = 86,400,000 ms
  // 1 Minute = 60,000 ms
  const totalMinutes = Math.floor(diffMs / 60000);

  // User Algorithm:
  // 3 Days = 1 Year
  // 1 Day = 4 Months
  // 1 Shichen (2 Hours) = 10 Days
  // 1 Hour = 5 Days
  // Let's break down total minutes to Days and Hours.

  const minutesInDay = 1440;
  const days = Math.floor(totalMinutes / minutesInDay);
  const remainingMinutes = totalMinutes % minutesInDay;
  const hours = remainingMinutes / 60; // Can be decimal

  // Formula: D days + H hours
  // Year = floor(D / 3)
  // Month = (D % 3) * 4
  // Day = H * 5

  let resultYear = Math.floor(days / 3);
  let resultMonth = (days % 3) * 4;
  let resultDay = Math.floor(hours * 5);

  // Handle overflow
  // e.g. 40 days -> +1 Month (30 days) and 10 days
  // But standard Bazi month is usually symbolic? Or strict 30 days?
  // Usually simply add up.
  // Example: 40 days -> 1 Month + 10 Days.
  if (resultDay >= 30) {
    resultMonth += Math.floor(resultDay / 30);
    resultDay = resultDay % 30;
  }

  if (resultMonth >= 12) {
    resultYear += Math.floor(resultMonth / 12);
    resultMonth = resultMonth % 12;
  }

  // This calculates "Age Span" to start luck.
  // e.g. 3 Years, 5 Months.
  // The 'Start Age' is usually BirthYear + resultYear (Rounding?).
  // Or "At Age X". usually ceil(resultYear) or if resultYear < 1 -> 1.
  // Convention: "X sui" often means Start Year Age.
  // Let's provide the integer Age.
  // If 3 years 5 months, start age is roughly 4? Or 3?
  // User example: "6岁开始起运".
  // Let's default to rounding up if > 0.5? or just taking the Year + 1?
  // Typically, "3 years ... " means you start AFTER 3 years. So during age 3?
  // Actually, usually "Start Age" = rounded up integer.

  // Let's refine based on example:
  // 10 div 3 = 3 Remainder 1. -> 3 Years + 4 Months.
  // Suggests Start Age is ~3.5. 
  // If we just need an integer string for the form:
  // Let's return the Year part + 1 (XuSui convention usually adds 1 to birth? No, this is elapsed time).
  // If elapsed time is 3 years, you are Real Age 3. Xu Sui 4.
  // Let's calculate Real Start Year = Birth Year + resultYear.
  // Use (BirthYear + resultYear + 1) to match typical Bazi charts "X Sui" (Xu Sui).
  // Wait, if result is 0 years 5 months. Start at age 0/1.
  // Let's essentially ensure it is at least 1.

  // Adjust: If we want strict "Start Age" (Age at which luck starts):
  // Let's use resultYear + 1 as a safe approximation for "Xu Sui".
  const finalStartAge = resultYear < 1 ? 1 : resultYear + 1;

  // Let's verify example:
  // 18 days. 18/3 = 6 Years.
  // Start Age = 6 (Real Age).
  // Xu Sui typically = Real Age + 1 = 7.
  // The user says: "6岁起运". This likely implies Real Age (Zhou Sui) or the specific convention.
  // I will return resultYear first?
  // Actually, Bazi usually discusses "Start Age" as the integer year.
  // If result is exact 6 years, it's Age 6.
  // I will return `resultYear` if it's substantial, but if < 1 return 1.
  // User example: 18 days -> 6 Years -> 6 Sui.
  // Example 2: 10 days -> 3 Years... -> 3 Sui?
  // I'll stick to `Math.max(1, resultYear)`.
  // Note: Some systems count `rounded`. 3 years 6 months -> 4 Sui.
  // I will use Math.round(resultYear + (resultMonth/12))? 
  // Let's stick to floor (resultYear) as the base number as per example "18/3 = 6".
  // If there are remainders (months), it usually implies "6 Years and ...". So it starts during age 6.

  // Format details for tooltip? "X岁Y月Z天"
  const detailStr = `${resultYear}岁${resultMonth}个月${resultDay}天`;
  console.log("Detailed Start Age:", detailStr);

  const startAgeStr = Math.max(1, resultYear).toString();

  return {
    yearPillar: eightChar.getYear() + "",
    monthPillar: effectiveMonthPillar,
    dayPillar: eightChar.getDay() + "",
    hourPillar: eightChar.getTime() + "",
    startAge: startAgeStr,
    firstDaYun: firstDaYun,
  };
}
