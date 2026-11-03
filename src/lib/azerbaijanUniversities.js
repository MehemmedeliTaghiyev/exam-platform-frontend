const img = (file) => `${import.meta.env.BASE_URL}universities/${file}`;

export const AZERBAIJAN_UNIVERSITIES = [
  { id: 'ada', name: 'ADA Universiteti', short: 'ADA', image: img('ada.jpg') },
  { id: 'adpu', name: 'Azərbaycan Dövlət Pedaqoji Universiteti', short: 'ADPU' },
  { id: 'adnsu', name: 'Azərbaycan Dövlət Neft və Sənaye Universiteti', short: 'ADNSU', image: img('adnsu.jpg') },
  { id: 'unec', name: 'Azərbaycan Dövlət İqtisad Universiteti', short: 'UNEC' },
  { id: 'azmiu', name: 'Azərbaycan Memarlıq və İnşaat Universiteti', short: 'AzMİU' },
  { id: 'atu', name: 'Azərbaycan Tibb Universiteti', short: 'ATU' },
  { id: 'adu', name: 'Azərbaycan Dillər Universiteti', short: 'ADU' },
  { id: 'aztu', name: 'Azərbaycan Texniki Universiteti', short: 'AzTU' },
  { id: 'admiu', name: 'Azərbaycan Dövlət Mədəniyyət və İncəsənət Universiteti', short: 'ADMİU' },
  { id: 'adau', name: 'Azərbaycan Dövlət Aqrar Universiteti', short: 'ADAU' },
  { id: 'adda', name: 'Azərbaycan Dövlət Dəniz Akademiyası', short: 'ADDA' },
  { id: 'atmu', name: 'Azərbaycan Turizm və Menecment Universiteti', short: 'ATMU' },
  { id: 'aku', name: 'Azərbaycan Kooperasiya Universiteti', short: 'AKU' },
  { id: 'au', name: 'Azərbaycan Universiteti', short: 'AU' },
  { id: 'uteca', name: 'Azərbaycan Texnologiya Universiteti', short: 'UTECA' },
  { id: 'asfa', name: 'Azərbaycan Dövlət Bədən Tərbiyəsi və İdman Akademiyası', short: 'ASFA' },
  { id: 'ama', name: 'Azərbaycan Dövlət Rəssamlıq Akademiyası', short: 'ARFA' },
  { id: 'bma', name: 'Bakı Musiqi Akademiyası', short: 'BMA' },
  { id: 'amk', name: 'Azərbaycan Milli Konservatoriyası', short: 'AMK' },
  { id: 'ufaz', name: 'Azərbaycan-Fransız Universiteti', short: 'UFAZ', image: img('ufaz.jpg') },
  { id: 'bdu', name: 'Bakı Dövlət Universiteti', short: 'BDU', image: img('bdu.jpg') },
  { id: 'bmu', name: 'Bakı Mühəndislik Universiteti', short: 'BMU' },
  { id: 'bsu', name: 'Bakı Slavyan Universiteti', short: 'BSU' },
  { id: 'bau', name: 'Bakı Avrasiya Universiteti', short: 'BAU' },
  { id: 'banm', name: 'Bakı Ali Neft Məktəbi', short: 'BANM' },
  { id: 'bqu', name: 'Bakı Qızlar Universiteti', short: 'BQU' },
  { id: 'dia', name: 'Azərbaycan Respublikasının Prezidenti yanında Dövlət İdarəçilik Akademiyası', short: 'DİA' },
  { id: 'gdu', name: 'Gəncə Dövlət Universiteti', short: 'GDU' },
  { id: 'xazar', name: 'Xəzər Universiteti', short: 'Xəzər' },
  { id: 'ldu', name: 'Lənkəran Dövlət Universiteti', short: 'LDU' },
  { id: 'mdu', name: 'Mingəçevir Dövlət Universiteti', short: 'MDU' },
  { id: 'naa', name: 'Milli Aviasiya Akademiyası', short: 'MAA' },
  { id: 'ndu', name: 'Naxçıvan Dövlət Universiteti', short: 'NDU' },
  { id: 'nmi', name: 'Naxçıvan Müəllimlər İnstitutu', short: 'NMİ' },
  { id: 'oyu', name: 'Odlar Yurdu Universiteti', short: 'OYU' },
  { id: 'sdu', name: 'Sumqayıt Dövlət Universiteti', short: 'SDU' },
  { id: 'wcu', name: 'Qərbi Kaspi Universiteti', short: 'WCU' },
  { id: 'aesma', name: 'Fövqəladə Hallar Nazirliyinin Akademiyası', short: 'FHN Akademiyası' },
  { id: 'pa', name: 'Polis Akademiyası', short: 'PA' },
  { id: 'customs', name: 'Dövlət Gömrük Komitəsinin Akademiyası', short: 'DGK Akademiyası' },
  { id: 'aes', name: 'Azərbaycan Əmək və Sosial Münasibətlər Akademiyası', short: 'AƏSMA' },
].sort((a, b) => a.name.localeCompare(b.name, 'az'));

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '');
}

export function universityById(id) {
  return AZERBAIJAN_UNIVERSITIES.find((row) => row.id === id) || null;
}

export function universityByName(name) {
  const key = norm(name);
  if (!key) return null;
  return AZERBAIJAN_UNIVERSITIES.find((row) => (
    norm(row.id) === key
    || norm(row.short) === key
    || norm(row.name) === key
    || norm(row.name).includes(key)
    || key.includes(norm(row.short))
  )) || null;
}

export function resolveUniversity(dream) {
  if (!dream) return null;
  return universityById(dream.universityId) || universityByName(dream.university) || null;
}

export function isListedUniversity(value) {
  return Boolean(universityById(value) || universityByName(value));
}
