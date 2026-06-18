const state = {
  token: localStorage.getItem('memberhub_token') || '',
  user: null,
  data: null,
  view: 'overview',
  pageRole: '',
  authRole: '',
  tables: {},
  loading: false
};

const roleText = {
  admin: 'Admin hệ thống',
  owner: 'Chủ cửa hàng',
  customer: 'Khách hàng'
};

const navItems = {
  admin: [
    ['overview', 'Tổng quan'],
    ['shops', 'Cửa hàng'],
    ['users', 'Người dùng'],
    ['customers', 'Khách hàng'],
    ['services', 'Dịch vụ'],
    ['cards', 'Thẻ thành viên'],
    ['transactions', 'Giao dịch'],
    ['promotions', 'Ưu đãi']
  ],
  owner: [
    ['overview', 'Tổng quan'],
    ['shop', 'Cửa hàng'],
    ['customers', 'Khách hàng'],
    ['services', 'Dịch vụ'],
    ['cards', 'Thẻ thành viên'],
    ['transactions', 'Giao dịch'],
    ['promotions', 'Ưu đãi']
  ],
  customer: [
    ['cards', 'Thẻ của tôi'],
    ['services', 'Dịch vụ'],
    ['transactions', 'Lịch sử'],
    ['promotions', 'Ưu đãi'],
    ['profile', 'Hồ sơ']
  ]
};

const titles = {
  overview: 'Tổng quan',
  shops: 'Quản lý cửa hàng',
  shop: 'Thông tin cửa hàng',
  users: 'Quản lý người dùng',
  customers: 'Quản lý khách hàng',
  services: 'Quản lý dịch vụ',
  cards: 'Quản lý thẻ thành viên',
  transactions: 'Lịch sử giao dịch',
  promotions: 'Chương trình ưu đãi',
  profile: 'Thông tin cá nhân'
};

const dictionaryLanguages = {
  vi: 'Tiếng Việt',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français'
};

const googleTranslateLanguages = {
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  pl: 'Polish',
  ru: 'Russian',
  uk: 'Ukrainian',
  tr: 'Turkish',
  ar: 'Arabic',
  hi: 'Hindi',
  bn: 'Bengali',
  id: 'Indonesian',
  ms: 'Malay',
  th: 'Thai',
  ja: 'Japanese',
  ko: 'Korean',
  'zh-CN': 'Chinese Simplified',
  'zh-TW': 'Chinese Traditional'
};

const languages = {
  ...dictionaryLanguages,
  ...googleTranslateLanguages
};

const googleTranslatePageLanguage = 'vi';
let googleTranslateLoadPromise = null;
let googleTranslateInitialized = false;

const translations = {
  en: {
    'Ngôn ngữ': 'Language',
    'Chọn khu vực đăng nhập': 'Choose sign-in area',
    'Quản lý hội viên đa cửa hàng': 'Multi-location membership management',
    'Chọn khu vực làm việc': 'Choose your workspace',
    'Mỗi vai trò có một trang đăng nhập riêng để dữ liệu và thao tác rõ ràng hơn.': 'Each role has its own sign-in page so data and actions stay clear.',
    'Quản lý cửa hàng, tài khoản và dữ liệu toàn hệ thống.': 'Manage stores, accounts, and system-wide data.',
    'Quản lý khách hàng, dịch vụ, thẻ và giao dịch của cửa hàng.': 'Manage store customers, services, cards, and transactions.',
    'Xem thẻ thành viên, điểm tích lũy, lịch sử và ưu đãi.': 'View membership cards, points, history, and offers.',
    'Admin hệ thống': 'System admin',
    'Chủ cửa hàng': 'Store owner',
    'Khách hàng': 'Customer',
    'Đăng nhập Admin': 'Admin sign in',
    'Khu vực cửa hàng': 'Store workspace',
    'Thẻ thành viên': 'Membership cards',
    'Quay lại': 'Back',
    'Đăng nhập': 'Sign in',
    'Đăng ký cửa hàng': 'Register store',
    'Đăng ký hội viên': 'Register member',
    'Email': 'Email',
    'Mật khẩu': 'Password',
    'Nhập mật khẩu': 'Enter password',
    'Đăng nhập cửa hàng': 'Store sign in',
    'Đăng nhập hội viên': 'Member sign in',
    'Họ tên chủ cửa hàng': 'Owner full name',
    'Email đăng nhập': 'Sign-in email',
    'Số điện thoại': 'Phone',
    'Tạo tài khoản cửa hàng': 'Create store account',
    'Tạo tài khoản hội viên': 'Create member account',
    'Tên cửa hàng': 'Store name',
    'Điện thoại cửa hàng': 'Store phone',
    'Địa chỉ cửa hàng': 'Store address',
    'Họ tên': 'Full name',
    'Cửa hàng': 'Stores',
    'Ngày sinh': 'Birthday',
    'Địa chỉ': 'Address',
    'Tổng quan': 'Overview',
    'Người dùng': 'Users',
    'Dịch vụ': 'Services',
    'Giao dịch': 'Transactions',
    'Ưu đãi': 'Offers',
    'Thẻ của tôi': 'My cards',
    'Lịch sử': 'History',
    'Hồ sơ': 'Profile',
    'Quản lý người dùng': 'User management',
    'Quản lý khách hàng': 'Customer management',
    'Quản lý dịch vụ': 'Service management',
    'Quản lý thẻ thành viên': 'Membership card management',
    'Lịch sử giao dịch': 'Transaction history',
    'Chương trình ưu đãi': 'Offer programs',
    'Thông tin cá nhân': 'Personal information',
    'Thông tin cửa hàng': 'Store information',
    'Đăng xuất': 'Sign out',
    'Tổng số': 'Total',
    'Cửa hàng mới': 'New stores',
    'Danh sách đang quản lý': 'Managed list',
    'Giao dịch gần đây': 'Recent transactions',
    'Doanh thu toàn hệ thống': 'System revenue',
    'Khách hàng gần đây': 'Recent customers',
    'Lịch sử sử dụng dịch vụ': 'Service usage history',
    'Doanh thu tháng': 'Monthly revenue',
    'Tổng điểm': 'Total points',
    'Doanh thu': 'Revenue',
    'Trạng thái': 'Status',
    'Điện thoại': 'Phone',
    'Mô tả': 'Description',
    'Tạo chủ mới - họ tên': 'Create new owner - name',
    'Tạo chủ mới - email': 'Create new owner - email',
    'Tạo chủ mới - mật khẩu': 'Create new owner - password',
    'Gán tài khoản chủ có sẵn': 'Assign existing user as owner',
    'Tài khoản chủ cửa hàng': 'Owner account',
    'Chưa gán': 'Unassigned',
    'Hoạt động': 'Active',
    'Tạm ẩn': 'Hidden',
    'Bị khóa': 'Locked',
    'Hết hạn': 'Expired',
    'Thêm cửa hàng': 'Add store',
    'Cập nhật cửa hàng': 'Update store',
    'Thêm người dùng': 'Add user',
    'Cập nhật người dùng': 'Update user',
    'Thêm khách hàng': 'Add customer',
    'Cập nhật khách hàng': 'Update customer',
    'Thêm dịch vụ': 'Add service',
    'Cập nhật dịch vụ': 'Update service',
    'Tạo thẻ': 'Create card',
    'Cập nhật thẻ': 'Update card',
    'Tạo thẻ thành viên': 'Create membership card',
    'Tạo giao dịch': 'Create transaction',
    'Thêm ưu đãi': 'Add offer',
    'Cập nhật ưu đãi': 'Update offer',
    'Cập nhật hồ sơ': 'Update profile',
    'Đóng': 'Close',
    'Hủy': 'Cancel',
    'Lưu': 'Save',
    'Sửa': 'Edit',
    'Khóa': 'Lock',
    'Mở khóa': 'Unlock',
    'Xóa': 'Delete',
    'Đã lưu thay đổi': 'Changes saved',
    'Đăng nhập thành công': 'Signed in successfully',
    'Tạo tài khoản thành công': 'Account created successfully',
    'Đã xóa': 'Deleted',
    'Chưa có dữ liệu': 'No data yet',
    'Chưa có thẻ thành viên': 'No membership card yet',
    'Chưa có ưu đãi đang áp dụng': 'No active offers yet',
    'Đường dẫn': 'URL',
    'Đường dẫn cửa hàng': 'Store URL slug',
    'Đường dẫn khách hàng': 'Customer URL slug',
    'Đang tải dữ liệu': 'Loading data',
    'Không tìm thấy đường dẫn này': 'This link was not found',
    'Danh sách dịch vụ đang hoạt động': 'Active service list',
    'Chương trình đang áp dụng': 'Active programs',
    'Điểm tích lũy': 'Points',
    'Hạng': 'Tier',
    'Ngày cấp': 'Issued date',
    'Hạn thẻ': 'Card expiry',
    'Ghi chú': 'Note',
    'Giá': 'Price',
    'Thời lượng phút': 'Duration in minutes',
    'Số tiền': 'Amount',
    'Điểm cộng/trừ': 'Points added/deducted'
  },
  de: {
    'Ngôn ngữ': 'Sprache',
    'Chọn khu vực đăng nhập': 'Anmeldebereich wählen',
    'Quản lý hội viên đa cửa hàng': 'Mitgliederverwaltung für mehrere Standorte',
    'Chọn khu vực làm việc': 'Arbeitsbereich wählen',
    'Mỗi vai trò có một trang đăng nhập riêng để dữ liệu và thao tác rõ ràng hơn.': 'Jede Rolle hat eine eigene Anmeldung, damit Daten und Aktionen klar getrennt bleiben.',
    'Quản lý cửa hàng, tài khoản và dữ liệu toàn hệ thống.': 'Stores, Konten und systemweite Daten verwalten.',
    'Quản lý khách hàng, dịch vụ, thẻ và giao dịch của cửa hàng.': 'Kunden, Services, Karten und Transaktionen des Stores verwalten.',
    'Xem thẻ thành viên, điểm tích lũy, lịch sử và ưu đãi.': 'Mitgliedskarten, Punkte, Verlauf und Angebote ansehen.',
    'Admin hệ thống': 'Systemadmin',
    'Chủ cửa hàng': 'Store-Inhaber',
    'Khách hàng': 'Kunde',
    'Đăng nhập Admin': 'Admin anmelden',
    'Khu vực cửa hàng': 'Store-Bereich',
    'Thẻ thành viên': 'Mitgliedskarten',
    'Quay lại': 'Zurück',
    'Đăng nhập': 'Anmelden',
    'Đăng ký cửa hàng': 'Store registrieren',
    'Đăng ký hội viên': 'Mitglied registrieren',
    'Email': 'E-Mail',
    'Mật khẩu': 'Passwort',
    'Nhập mật khẩu': 'Passwort eingeben',
    'Đăng nhập cửa hàng': 'Store anmelden',
    'Đăng nhập hội viên': 'Mitglied anmelden',
    'Họ tên chủ cửa hàng': 'Name des Inhabers',
    'Email đăng nhập': 'Anmelde-E-Mail',
    'Số điện thoại': 'Telefon',
    'Tạo tài khoản cửa hàng': 'Store-Konto erstellen',
    'Tạo tài khoản hội viên': 'Mitgliedskonto erstellen',
    'Tên cửa hàng': 'Store-Name',
    'Điện thoại cửa hàng': 'Store-Telefon',
    'Địa chỉ cửa hàng': 'Store-Adresse',
    'Họ tên': 'Vollständiger Name',
    'Cửa hàng': 'Stores',
    'Ngày sinh': 'Geburtstag',
    'Địa chỉ': 'Adresse',
    'Tổng quan': 'Übersicht',
    'Người dùng': 'Benutzer',
    'Dịch vụ': 'Services',
    'Giao dịch': 'Transaktionen',
    'Ưu đãi': 'Angebote',
    'Thẻ của tôi': 'Meine Karten',
    'Lịch sử': 'Verlauf',
    'Hồ sơ': 'Profil',
    'Quản lý người dùng': 'Benutzerverwaltung',
    'Quản lý khách hàng': 'Kundenverwaltung',
    'Quản lý dịch vụ': 'Serviceverwaltung',
    'Quản lý thẻ thành viên': 'Kartenverwaltung',
    'Lịch sử giao dịch': 'Transaktionsverlauf',
    'Chương trình ưu đãi': 'Angebotsprogramme',
    'Thông tin cá nhân': 'Persönliche Daten',
    'Thông tin cửa hàng': 'Store-Informationen',
    'Đăng xuất': 'Abmelden',
    'Tổng số': 'Gesamt',
    'Cửa hàng mới': 'Neue Stores',
    'Danh sách đang quản lý': 'Verwaltete Liste',
    'Giao dịch gần đây': 'Letzte Transaktionen',
    'Doanh thu toàn hệ thống': 'Systemumsatz',
    'Khách hàng gần đây': 'Neue Kunden',
    'Lịch sử sử dụng dịch vụ': 'Serviceverlauf',
    'Doanh thu tháng': 'Monatsumsatz',
    'Tổng điểm': 'Gesamtpunkte',
    'Doanh thu': 'Umsatz',
    'Trạng thái': 'Status',
    'Điện thoại': 'Telefon',
    'Mô tả': 'Beschreibung',
    'Tạo chủ mới - họ tên': 'Neuen Inhaber erstellen - Name',
    'Tạo chủ mới - email': 'Neuen Inhaber erstellen - E-Mail',
    'Tạo chủ mới - mật khẩu': 'Neuen Inhaber erstellen - Passwort',
    'Gán tài khoản chủ có sẵn': 'Vorhandenen Benutzer als Inhaber zuweisen',
    'Tài khoản chủ cửa hàng': 'Inhaberkonto',
    'Chưa gán': 'Nicht zugewiesen',
    'Hoạt động': 'Aktiv',
    'Tạm ẩn': 'Ausgeblendet',
    'Bị khóa': 'Gesperrt',
    'Hết hạn': 'Abgelaufen',
    'Thêm cửa hàng': 'Store hinzufügen',
    'Cập nhật cửa hàng': 'Store aktualisieren',
    'Thêm người dùng': 'Benutzer hinzufügen',
    'Cập nhật người dùng': 'Benutzer aktualisieren',
    'Thêm khách hàng': 'Kunde hinzufügen',
    'Cập nhật khách hàng': 'Kunde aktualisieren',
    'Thêm dịch vụ': 'Service hinzufügen',
    'Cập nhật dịch vụ': 'Service aktualisieren',
    'Tạo thẻ': 'Karte erstellen',
    'Cập nhật thẻ': 'Karte aktualisieren',
    'Tạo thẻ thành viên': 'Mitgliedskarte erstellen',
    'Tạo giao dịch': 'Transaktion erstellen',
    'Thêm ưu đãi': 'Angebot hinzufügen',
    'Cập nhật ưu đãi': 'Angebot aktualisieren',
    'Cập nhật hồ sơ': 'Profil aktualisieren',
    'Đóng': 'Schließen',
    'Hủy': 'Abbrechen',
    'Lưu': 'Speichern',
    'Sửa': 'Bearbeiten',
    'Khóa': 'Sperren',
    'Mở khóa': 'Entsperren',
    'Xóa': 'Löschen',
    'Đã lưu thay đổi': 'Änderungen gespeichert',
    'Đăng nhập thành công': 'Erfolgreich angemeldet',
    'Tạo tài khoản thành công': 'Konto erfolgreich erstellt',
    'Đã xóa': 'Gelöscht',
    'Chưa có dữ liệu': 'Noch keine Daten',
    'Chưa có thẻ thành viên': 'Noch keine Mitgliedskarte',
    'Chưa có ưu đãi đang áp dụng': 'Keine aktiven Angebote',
    'Đường dẫn': 'URL',
    'Đường dẫn cửa hàng': 'Store-URL-Slug',
    'Đường dẫn khách hàng': 'Kunden-URL-Slug',
    'Đang tải dữ liệu': 'Daten werden geladen',
    'Không tìm thấy đường dẫn này': 'Dieser Link wurde nicht gefunden',
    'Danh sách dịch vụ đang hoạt động': 'Aktive Serviceliste',
    'Chương trình đang áp dụng': 'Aktive Programme',
    'Điểm tích lũy': 'Punkte',
    'Hạng': 'Stufe',
    'Ngày cấp': 'Ausgestellt am',
    'Hạn thẻ': 'Kartengültigkeit',
    'Ghi chú': 'Notiz',
    'Giá': 'Preis',
    'Thời lượng phút': 'Dauer in Minuten',
    'Số tiền': 'Betrag',
    'Điểm cộng/trừ': 'Punkte plus/minus'
  },
  fr: {
    'Ngôn ngữ': 'Langue',
    'Chọn khu vực đăng nhập': 'Choisir la zone de connexion',
    'Quản lý hội viên đa cửa hàng': 'Gestion des membres multi-sites',
    'Chọn khu vực làm việc': 'Choisir votre espace',
    'Mỗi vai trò có một trang đăng nhập riêng để dữ liệu và thao tác rõ ràng hơn.': 'Chaque rôle dispose de sa propre page de connexion pour garder les données et actions claires.',
    'Quản lý cửa hàng, tài khoản và dữ liệu toàn hệ thống.': 'Gérer les magasins, les comptes et les données du système.',
    'Quản lý khách hàng, dịch vụ, thẻ và giao dịch của cửa hàng.': 'Gérer les clients, services, cartes et transactions du magasin.',
    'Xem thẻ thành viên, điểm tích lũy, lịch sử và ưu đãi.': 'Voir les cartes, points, historique et offres.',
    'Admin hệ thống': 'Admin système',
    'Chủ cửa hàng': 'Propriétaire',
    'Khách hàng': 'Client',
    'Đăng nhập Admin': 'Connexion admin',
    'Khu vực cửa hàng': 'Espace magasin',
    'Thẻ thành viên': 'Cartes membre',
    'Quay lại': 'Retour',
    'Đăng nhập': 'Connexion',
    'Đăng ký cửa hàng': 'Inscrire un magasin',
    'Đăng ký hội viên': 'Inscrire un membre',
    'Email': 'E-mail',
    'Mật khẩu': 'Mot de passe',
    'Nhập mật khẩu': 'Saisir le mot de passe',
    'Đăng nhập cửa hàng': 'Connexion magasin',
    'Đăng nhập hội viên': 'Connexion membre',
    'Họ tên chủ cửa hàng': 'Nom du propriétaire',
    'Email đăng nhập': 'E-mail de connexion',
    'Số điện thoại': 'Téléphone',
    'Tạo tài khoản cửa hàng': 'Créer un compte magasin',
    'Tạo tài khoản hội viên': 'Créer un compte membre',
    'Tên cửa hàng': 'Nom du magasin',
    'Điện thoại cửa hàng': 'Téléphone du magasin',
    'Địa chỉ cửa hàng': 'Adresse du magasin',
    'Họ tên': 'Nom complet',
    'Cửa hàng': 'Magasins',
    'Ngày sinh': 'Date de naissance',
    'Địa chỉ': 'Adresse',
    'Tổng quan': 'Vue d’ensemble',
    'Người dùng': 'Utilisateurs',
    'Dịch vụ': 'Services',
    'Giao dịch': 'Transactions',
    'Ưu đãi': 'Offres',
    'Thẻ của tôi': 'Mes cartes',
    'Lịch sử': 'Historique',
    'Hồ sơ': 'Profil',
    'Quản lý người dùng': 'Gestion des utilisateurs',
    'Quản lý khách hàng': 'Gestion des clients',
    'Quản lý dịch vụ': 'Gestion des services',
    'Quản lý thẻ thành viên': 'Gestion des cartes membre',
    'Lịch sử giao dịch': 'Historique des transactions',
    'Chương trình ưu đãi': 'Programmes d’offres',
    'Thông tin cá nhân': 'Informations personnelles',
    'Thông tin cửa hàng': 'Informations magasin',
    'Đăng xuất': 'Déconnexion',
    'Tổng số': 'Total',
    'Cửa hàng mới': 'Nouveaux magasins',
    'Danh sách đang quản lý': 'Liste gérée',
    'Giao dịch gần đây': 'Transactions récentes',
    'Doanh thu toàn hệ thống': 'Revenu système',
    'Khách hàng gần đây': 'Clients récents',
    'Lịch sử sử dụng dịch vụ': 'Historique des services',
    'Doanh thu tháng': 'Revenu mensuel',
    'Tổng điểm': 'Points totaux',
    'Doanh thu': 'Revenu',
    'Trạng thái': 'Statut',
    'Điện thoại': 'Téléphone',
    'Mô tả': 'Description',
    'Tạo chủ mới - họ tên': 'Créer un propriétaire - nom',
    'Tạo chủ mới - email': 'Créer un propriétaire - e-mail',
    'Tạo chủ mới - mật khẩu': 'Créer un propriétaire - mot de passe',
    'Gán tài khoản chủ có sẵn': 'Attribuer un utilisateur existant comme propriétaire',
    'Tài khoản chủ cửa hàng': 'Compte propriétaire',
    'Chưa gán': 'Non attribué',
    'Hoạt động': 'Actif',
    'Tạm ẩn': 'Masqué',
    'Bị khóa': 'Verrouillé',
    'Hết hạn': 'Expiré',
    'Thêm cửa hàng': 'Ajouter un magasin',
    'Cập nhật cửa hàng': 'Mettre à jour le magasin',
    'Thêm người dùng': 'Ajouter un utilisateur',
    'Cập nhật người dùng': 'Mettre à jour l’utilisateur',
    'Thêm khách hàng': 'Ajouter un client',
    'Cập nhật khách hàng': 'Mettre à jour le client',
    'Thêm dịch vụ': 'Ajouter un service',
    'Cập nhật dịch vụ': 'Mettre à jour le service',
    'Tạo thẻ': 'Créer une carte',
    'Cập nhật thẻ': 'Mettre à jour la carte',
    'Tạo thẻ thành viên': 'Créer une carte membre',
    'Tạo giao dịch': 'Créer une transaction',
    'Thêm ưu đãi': 'Ajouter une offre',
    'Cập nhật ưu đãi': 'Mettre à jour l’offre',
    'Cập nhật hồ sơ': 'Mettre à jour le profil',
    'Đóng': 'Fermer',
    'Hủy': 'Annuler',
    'Lưu': 'Enregistrer',
    'Sửa': 'Modifier',
    'Khóa': 'Verrouiller',
    'Mở khóa': 'Déverrouiller',
    'Xóa': 'Supprimer',
    'Đã lưu thay đổi': 'Modifications enregistrées',
    'Đăng nhập thành công': 'Connexion réussie',
    'Tạo tài khoản thành công': 'Compte créé',
    'Đã xóa': 'Supprimé',
    'Chưa có dữ liệu': 'Aucune donnée',
    'Chưa có thẻ thành viên': 'Aucune carte membre',
    'Chưa có ưu đãi đang áp dụng': 'Aucune offre active',
    'Đường dẫn': 'URL',
    'Đường dẫn cửa hàng': 'Slug URL du magasin',
    'Đường dẫn khách hàng': 'Slug URL du client',
    'Đang tải dữ liệu': 'Chargement des données',
    'Không tìm thấy đường dẫn này': 'Ce lien est introuvable',
    'Danh sách dịch vụ đang hoạt động': 'Liste des services actifs',
    'Chương trình đang áp dụng': 'Programmes actifs',
    'Điểm tích lũy': 'Points',
    'Hạng': 'Niveau',
    'Ngày cấp': 'Date d’émission',
    'Hạn thẻ': 'Expiration de la carte',
    'Ghi chú': 'Note',
    'Giá': 'Prix',
    'Thời lượng phút': 'Durée en minutes',
    'Số tiền': 'Montant',
    'Điểm cộng/trừ': 'Points ajoutés/retirés'
  }
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  applyTheme();
  state.pageRole = document.body.dataset.pageRole || '';
  state.authRole = document.body.dataset.authRole || '';
  const page = document.body.dataset.page || 'auth';
  renderLanguageControls();

  if (page === 'public') {
    loadPublicPortal();
    return;
  }

  if (page === 'auth') {
    bindAuth();
    showAuth();
    loadPublicShops();
    applyI18n();
    return;
  }

  bindShell();
  if (!state.token) {
    window.location.href = loginPageForRole(state.pageRole);
    return;
  }
  boot().catch(() => {
    localStorage.removeItem('memberhub_token');
    state.token = '';
    window.location.href = loginPageForRole(state.pageRole);
  });
}

function bindAuth() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  if (!loginForm) return;

  document.querySelectorAll('[data-auth-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-auth-tab]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      const mode = button.dataset.authTab;
      loginForm.classList.toggle('hidden', mode !== 'login');
      registerForm?.classList.toggle('hidden', mode !== 'register');
    });
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = formData(event.currentTarget);
    if (state.authRole) payload.role = state.authRole;
    try {
      const response = await api('/api/auth/login', { method: 'POST', body: payload, auth: false });
      state.token = response.token;
      state.user = response.user;
      localStorage.setItem('memberhub_token', state.token);
      toast('Đăng nhập thành công');
      redirectToRole(response.user.role);
    } catch (error) {
      toast(error.message, true);
    }
  });

  registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = formData(event.currentTarget);
    if (state.authRole) payload.role = state.authRole;
    try {
      const response = await api('/api/auth/register', { method: 'POST', body: payload, auth: false });
      state.token = response.token;
      state.user = response.user;
      localStorage.setItem('memberhub_token', state.token);
      toast('Tạo tài khoản thành công');
      redirectToRole(response.user.role);
    } catch (error) {
      toast(error.message, true);
    }
  });

  document.getElementById('register-role')?.addEventListener('change', (event) => {
    const isOwner = event.target.value === 'owner';
    document.getElementById('owner-register-fields')?.classList.toggle('hidden', !isOwner);
    document.getElementById('customer-register-fields')?.classList.toggle('hidden', isOwner);
  });
}

function bindShell() {
  if (!document.getElementById('logout-button')) return;

  document.getElementById('logout-button').addEventListener('click', () => {
    const role = state.user?.role || state.pageRole;
    localStorage.removeItem('memberhub_token');
    state.token = '';
    state.user = null;
    state.data = null;
    window.location.href = loginPageForRole(role);
  });

  document.getElementById('nav').addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    state.view = button.dataset.view;
    state.tables[state.view] = { ...(state.tables[state.view] || {}), page: 1 };
    renderApp();
  });
}

async function boot() {
  const me = await api('/api/me');
  state.user = me.user;
  if (state.pageRole && state.user.role !== state.pageRole) {
    redirectToRole(state.user.role);
    return;
  }
  state.data = await api('/api/app-data');
  const firstView = navItems[state.user.role][0][0];
  if (!navItems[state.user.role].some(([view]) => view === state.view)) {
    state.view = firstView;
  }
  renderApp();
}

function showAuth() {
  document.getElementById('auth-screen')?.classList.remove('hidden');
  document.getElementById('app-shell')?.classList.add('hidden');
}

function renderApp() {
  if (!document.getElementById('app-shell')) return;
  document.getElementById('auth-screen')?.classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('role-label').textContent = roleText[state.user.role];
  document.getElementById('account-name').textContent = state.user.name;
  document.getElementById('context-label').textContent = roleText[state.user.role];
  document.getElementById('view-title').textContent = viewTitle();
  ensureThemeButton();
  enhanceBrandBlock();

  renderNav();
  const view = document.getElementById('view');
  view.innerHTML = renderCurrentView();
  bindViewActions(view);
  bindTableControls(view);
  renderLanguageControls();
  applyI18n(document.getElementById('app-shell'));
}

function renderNav() {
  document.getElementById('nav').innerHTML = navItems[state.user.role].map(([view, label]) => `
    <button type="button" data-view="${view}" class="${state.view === view ? 'active' : ''}">
      <span class="nav-icon">${iconForView(view)}</span>
      <span>${label}</span>
    </button>
  `).join('');
}

function svgIcon(name) {
  const paths = {
    overview: '<path d="M4 13h6V4H4v9Z"/><path d="M14 20h6V4h-6v16Z"/><path d="M4 20h6v-3H4v3Z"/>',
    shops: '<path d="M4 10h16l-1.5-5h-13L4 10Z"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    shop: '<path d="M4 10h16l-1.5-5h-13L4 10Z"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    customers: '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/>',
    services: '<path d="m14.7 6.3 3 3"/><path d="M19 8.5 8.5 19 5 20l1-3.5L16.5 6a2.1 2.1 0 0 1 3 3Z"/>',
    cards: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/>',
    transactions: '<path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h6"/><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/>',
    promotions: '<path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5A2.5 2.5 0 1 1 10 4.5C10 7 12 7 12 7Z"/><path d="M12 7h4.5A2.5 2.5 0 1 0 14 4.5C14 7 12 7 12 7Z"/>',
    profile: '<path d="M20 21a8 8 0 1 0-16 0"/><circle cx="12" cy="7" r="4"/>',
    revenue: '<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.08-7.08l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.08 7.08l1.71-1.71"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    lock: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/>',
    sparkles: '<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    check: '<path d="m20 6-11 11-5-5"/>'
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.overview}</svg>`;
}

function iconForView(view) {
  return svgIcon(view);
}

function iconForStat(label) {
  const text = normalizeSearch(label);
  if (text.includes('doanh') || text.includes('revenue') || text.includes('spent')) return svgIcon('revenue');
  if (text.includes('khach') || text.includes('customer')) return svgIcon('customers');
  if (text.includes('giao') || text.includes('transaction')) return svgIcon('transactions');
  if (text.includes('diem') || text.includes('point')) return svgIcon('promotions');
  if (text.includes('dich') || text.includes('service')) return svgIcon('services');
  if (text.includes('the') || text.includes('card')) return svgIcon('cards');
  return svgIcon('shops');
}

function renderCurrentView() {
  if (state.view === 'overview') return renderOverview();
  if (state.view === 'shops') return renderShops();
  if (state.view === 'shop') return renderOwnerShop();
  if (state.view === 'users') return renderUsers();
  if (state.view === 'customers') return renderCustomers();
  if (state.view === 'services') return state.user.role === 'customer' ? renderCustomerServices() : renderServices();
  if (state.view === 'cards') return state.user.role === 'customer' ? renderCustomerCards() : renderCards();
  if (state.view === 'transactions') return renderTransactions();
  if (state.view === 'promotions') return state.user.role === 'customer' ? renderCustomerPromotions() : renderPromotions();
  if (state.view === 'profile') return renderProfile();
  return '';
}

function viewTitle() {
  if (state.user?.role === 'customer' && state.view === 'services') return 'Dịch vụ cửa hàng';
  return titles[state.view] || 'Dashboard';
}

function renderOverview() {
  const stats = state.data.stats || {};
  if (state.user.role === 'admin') {
    return `
      ${dashboardIntro('Control center', 'Quan sat he thong cua hang, thanh vien va doanh thu trong mot man hinh.', [
        ['Stores', state.data.shops.length],
        ['Customers', state.data.customers.length],
        ['Today', new Date().toLocaleDateString('vi-VN')]
      ])}
      ${statsGrid([
        ['Cửa hàng', stats.totalShops],
        ['Khách hàng', stats.totalCustomers],
        ['Giao dịch', stats.totalTransactions],
        ['Doanh thu', currency(stats.totalRevenue)]
      ])}
      <div class="split-grid">
        ${panel('Cửa hàng mới', 'Danh sách đang quản lý', table(state.data.shops.slice(0, 6), shopColumns(), []))}
        ${panel('Giao dịch gần đây', 'Doanh thu toàn hệ thống', table(state.data.transactions.slice(0, 6), transactionColumns(), []))}
      </div>
      ${adminToolsPanel()}
      ${reportPanels()}
      ${birthdayReminderPanel()}
    `;
  }

  if (state.user.role === 'owner') {
    return `
      ${dashboardIntro(state.data.shop?.name || 'Store dashboard', 'Theo doi khach hang, giao dich va uu dai cua cua hang.', [
        ['Customers', state.data.customers.length],
        ['Cards', state.data.cards.length],
        ['Today', new Date().toLocaleDateString('vi-VN')]
      ])}
      ${statsGrid([
        ['Khách hàng', stats.totalCustomers],
        ['Dịch vụ', stats.totalServices],
        ['Doanh thu tháng', currency(stats.monthlyRevenue)],
        ['Tổng điểm', stats.totalPoints]
      ])}
      <div class="split-grid">
        ${panel('Khách hàng gần đây', state.data.shop.name, table(state.data.customers.slice(0, 6), customerColumns(), []))}
        ${panel('Giao dịch gần đây', 'Lịch sử sử dụng dịch vụ', table(state.data.transactions.slice(0, 6), transactionColumns(), []))}
      </div>
      ${reportPanels()}
      ${birthdayReminderPanel()}
    `;
  }

  return renderCustomerCards();
}

function dashboardIntro(title, description, items) {
  return `
    <section class="dashboard-intro">
      <div>
        <span>MemberHub</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </div>
      <div class="dashboard-intro-metrics">
        ${items.map(([label, value]) => `
          <article>
            <strong>${escapeHtml(value)}</strong>
            <span>${escapeHtml(label)}</span>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function adminToolsPanel() {
  if (state.user.role !== 'admin') return '';
  return panel(
    'Cong cu he thong',
    'Sao luu du lieu MariaDB dang su dung',
    '<div class="notice"><strong>Backup database</strong><p>File JSON se khong chua password hash hoac salt.</p></div>',
    panelActions('<button class="primary" type="button" data-action="backup">Backup database</button>')
  );
}

function reportPanels() {
  const transactions = state.data.transactions || [];
  const cards = state.data.cards || [];
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const dailyRevenue = transactions
    .filter((item) => String(item.created_at || '').slice(0, 10) === today)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthlyRevenue = transactions
    .filter((item) => String(item.created_at || '').slice(0, 7) === month)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const loyal = [...cards]
    .sort((a, b) => Number(b.points || 0) - Number(a.points || 0))
    .slice(0, 5);

  return `
    <div class="split-grid">
      ${panel('Bao cao doanh thu', 'Theo ngay va thang hien tai', statsGrid([
        ['Hom nay', currency(dailyRevenue)],
        ['Thang nay', currency(monthlyRevenue)],
        ['So giao dich', transactions.length],
        ['Khach co the', cards.length]
      ]))}
      ${panel('Khach hang than thiet', 'Top diem tich luy', table(loyal, [
        ['customer_name', 'Khach hang'],
        ['shop_name', 'Cua hang'],
        ['tier', 'Hang', badge],
        ['points', 'Diem', number]
      ], []))}
    </div>
  `;
}

function renderShops() {
  return dataPanel(
    'shops',
    'Cửa hàng',
    'Tổng số: ' + state.data.shops.length,
    state.data.shops,
    shopColumns(),
    ['edit', 'toggleShop', 'delete'],
    panelActions(exportButtons('shops'), '<button class="primary" type="button" data-action="open" data-resource="shop">Th\u00eam c\u1eeda h\u00e0ng</button>')
  );
}

function renderOwnerShop() {
  const shop = state.data.shop;
  return `
    ${statsGrid([
      ['Tên cửa hàng', escapeHtml(shop.name)],
      ['Trạng thái', badge(shop.status)],
      ['Khách hàng', state.data.stats.totalCustomers],
      ['Doanh thu', currency(state.data.stats.totalRevenue)]
    ])}
    ${panel('Thông tin cửa hàng', 'Chủ sở hữu: ' + escapeHtml(shop.owner_name || state.user.name), `
      <div class="table-wrap">
        <table>
          <tbody>
            <tr><th>Tên</th><td>${escapeHtml(shop.name)}</td></tr>
            <tr><th>Email</th><td>${escapeHtml(shop.email || '')}</td></tr>
            <tr><th>Điện thoại</th><td>${escapeHtml(shop.phone || '')}</td></tr>
            <tr><th>Địa chỉ</th><td>${escapeHtml(shop.address || '')}</td></tr>
            <tr><th>Mô tả</th><td>${escapeHtml(shop.description || '')}</td></tr>
          </tbody>
        </table>
      </div>
    `, '<button class="primary" type="button" data-action="open" data-resource="shop" data-id="' + shop.id + '">Cập nhật</button>')}
  `;
}

function renderUsers() {
  return dataPanel(
    'users',
    'Người dùng',
    'Chủ cửa hàng và khách hàng có tài khoản',
    state.data.users,
    [
      ['name', 'Họ tên'],
      ['email', 'Email'],
      ['role', 'Vai trò', (value) => roleText[value] || value],
      ['shop_name', 'Cửa hàng'],
      ['phone', 'Điện thoại'],
      ['status', 'Trạng thái', badge]
    ],
    ['edit', 'toggleUser', 'delete'],
    panelActions(exportButtons('users'), '<button class="primary" type="button" data-action="open" data-resource="user">Th\u00eam ng\u01b0\u1eddi d\u00f9ng</button>')
  );
}

function renderCustomers() {
  return dataPanel(
    'customers',
    'Khách hàng',
    'Phạm vi dữ liệu theo phân quyền',
    state.data.customers,
    customerColumns(),
    ['edit', 'delete'],
    panelActions(exportButtons('customers'), '<button class="primary" type="button" data-action="open" data-resource="customer">Th\u00eam kh\u00e1ch h\u00e0ng</button>')
  );
}

function renderServices() {
  return dataPanel(
    'services',
    'Dịch vụ',
    'Danh sách dịch vụ của cửa hàng',
    state.data.services,
    serviceColumns(),
    ['edit', 'delete'],
    panelActions(exportButtons('services'), '<button class="primary" type="button" data-action="open" data-resource="service">Th\u00eam d\u1ecbch v\u1ee5</button>')
  );
}

function renderCustomerServices() {
  const services = state.data.services || [];
  const purchases = (state.data.transactions || []).filter((item) => item.service_id || item.service_name);

  return `
    ${dataPanel(
      'services',
      'Dịch vụ',
      'Dịch vụ đang mở bán tại cửa hàng bạn đã đăng ký',
      services,
      customerServiceColumns(),
      ['buyService'],
      ''
    )}
    ${panel(
      'Dịch vụ đã mua',
      'Các dịch vụ đã ghi nhận trong lịch sử của bạn',
      table(purchases, purchasedServiceColumns(), [])
    )}
  `;
}

function renderCards() {
  return dataPanel(
    'cards',
    'Thẻ thành viên',
    'Điểm tích lũy và hạng hội viên',
    state.data.cards,
    cardColumns(),
    ['edit', 'delete'],
    panelActions(exportButtons('cards'), '<button class="primary" type="button" data-action="open" data-resource="card">T\u1ea1o th\u1ebb</button>')
  );
}

function renderCustomerCards() {
  const cards = state.data.cards || [];
  const mainCard = cards[0];
  const cardHtml = mainCard
    ? renderMembershipCard(mainCard, mainCard.shop_name, cardPublicUrl(mainCard))
    : '<div class="empty">Chưa có thẻ thành viên</div>';

  return `
    ${renderNotices()}
    ${statsGrid([
      ['Tổng điểm', state.data.stats.totalPoints],
      ['Giao dịch', state.data.stats.totalTransactions],
      ['Đã chi tiêu', currency(state.data.stats.totalSpent)],
      ['Ưu đãi', state.data.stats.activePromotions]
    ])}
    <div class="split-grid">
      ${cardHtml}
      ${panel('Danh sách thẻ', 'Tất cả cửa hàng đã đăng ký', table(cards, cardColumns(), []), panelActions(exportButtons('cards')))}
    </div>
  `;
}

function renderTransactions() {
  const allowCreate = state.user.role !== 'customer';
  return dataPanel(
    'transactions',
    'Giao dịch',
    'Lịch sử khách hàng sử dụng dịch vụ',
    state.data.transactions,
    transactionColumns(),
    allowCreate ? ['delete'] : [],
    panelActions(exportButtons('transactions'), allowCreate ? '<button class="primary" type="button" data-action="open" data-resource="transaction">T\u1ea1o giao d\u1ecbch</button>' : '')
  );
}

function renderPromotions() {
  return dataPanel(
    'promotions',
    'Ưu đãi',
    'Chương trình đang quản lý',
    state.data.promotions,
    promotionColumns(),
    ['edit', 'delete'],
    panelActions(exportButtons('promotions'), '<button class="primary" type="button" data-action="open" data-resource="promotion">Th\u00eam \u01b0u \u0111\u00e3i</button>')
  );
}

function renderCustomerPromotions() {
  const promos = state.data.promotions || [];
  if (!promos.length) {
    return '<div class="empty">Chưa có ưu đãi đang áp dụng</div>';
  }
  return `
    <div class="promo-grid">
      ${promos.map((promo) => `
        <article class="promo-card">
          <span class="badge">${number(promo.discount_percent)}%</span>
          <strong>${escapeHtml(promo.title)}</strong>
          <p>${escapeHtml(promo.description || '')}</p>
          <p>${escapeHtml(promo.shop_name)} · ${date(promo.start_date)} - ${date(promo.end_date)}</p>
        </article>
      `).join('')}
    </div>
  `;
}

function renderProfile() {
  const profile = state.data.profile || state.user;
  return panel('Hồ sơ cá nhân', escapeHtml(profile.email), `
    <div class="table-wrap">
      <table>
        <tbody>
          <tr><th>Họ tên</th><td>${escapeHtml(profile.name)}</td></tr>
          <tr><th>Email</th><td>${escapeHtml(profile.email)}</td></tr>
          <tr><th>Điện thoại</th><td>${escapeHtml(profile.phone || '')}</td></tr>
          <tr><th>Ngày sinh</th><td>${date(profile.birthday)}</td></tr>
          <tr><th>Địa chỉ</th><td>${escapeHtml(profile.address || '')}</td></tr>
        </tbody>
      </table>
    </div>
  `, '<button class="primary" type="button" data-action="open" data-resource="profile">Cập nhật hồ sơ</button>');
}

function bindViewActions(root) {
  root.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.action;
      const resource = button.dataset.resource;
      const id = button.dataset.id ? Number(button.dataset.id) : null;
      if (action === 'open') openModal(resource, id);
      if (action === 'delete') deleteResource(resource, id);
      if (action === 'toggle-shop') toggleShop(id);
      if (action === 'toggle-user') toggleUser(id);
      if (action === 'buy-service') purchaseService(id);
      if (action === 'export-excel') exportData(resource, 'excel');
      if (action === 'export-pdf') exportData(resource, 'pdf');
      if (action === 'backup') backupDatabase();
    });
  });
}

function panel(title, subtitle, content, action = '') {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${subtitle}</p>
        </div>
        ${action}
      </div>
      ${content}
    </section>
  `;
}

function panelActions(...items) {
  const content = items.filter(Boolean).join('');
  return content ? `<div class="panel-actions">${content}</div>` : '';
}

function dataPanel(resource, title, subtitle, rows, columns, actions, action = '') {
  const filtered = filterRows(resource, rows || []);
  const paging = tableState(resource);
  const pageSize = Number(paging.pageSize || 8);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, Number(paging.page || 1)), totalPages);
  paging.page = page;
  const visibleRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const meta = `${filtered.length}/${(rows || []).length}`;
  return panel(
    title,
    `${subtitle} - Hien thi: ${meta}`,
    `${tableControls(resource)}${table(visibleRows, columns, actions)}${pagination(resource, page, totalPages, filtered.length)}`,
    action
  );
}

function tableState(resource) {
  if (!state.tables[resource]) {
    state.tables[resource] = { q: '', page: 1, pageSize: 8, status: '', tier: '', from: '', to: '' };
  }
  return state.tables[resource];
}

function tableControls(resource) {
  const filters = tableState(resource);
  const tierFilter = ['customers', 'cards'].includes(resource) ? `
    <select data-table-filter="tier" aria-label="Loc hang">
      <option value="">Tat ca hang</option>
      ${['Silver', 'Gold', 'Platinum', 'Diamond'].map((tier) => `
        <option value="${tier}" ${filters.tier === tier ? 'selected' : ''}>${tier}</option>
      `).join('')}
    </select>
  ` : '';
  const statusFilter = ['shops', 'users', 'customers', 'services', 'cards', 'promotions'].includes(resource) ? `
    <select data-table-filter="status" aria-label="Loc trang thai">
      <option value="">Tat ca trang thai</option>
      ${['active', 'inactive', 'locked', 'expired'].map((status) => `
        <option value="${status}" ${filters.status === status ? 'selected' : ''}>${statusLabel(status)}</option>
      `).join('')}
    </select>
  ` : '';
  const dateFilter = resource === 'transactions' ? `
    <input data-table-filter="from" type="date" value="${escapeHtml(filters.from || '')}" aria-label="Tu ngay">
    <input data-table-filter="to" type="date" value="${escapeHtml(filters.to || '')}" aria-label="Den ngay">
  ` : '';

  return `
    <div class="table-tools" data-table="${resource}">
      <input data-table-filter="q" type="search" value="${escapeHtml(filters.q || '')}" placeholder="Tim theo ten, email, so dien thoai...">
      ${tierFilter}
      ${statusFilter}
      ${dateFilter}
    </div>
  `;
}

function bindTableControls(root) {
  root.querySelectorAll('[data-table]').forEach((tools) => {
    const resource = tools.dataset.table;
    tools.querySelectorAll('[data-table-filter]').forEach((field) => {
      field.addEventListener(field.type === 'search' ? 'input' : 'change', () => {
        tableState(resource)[field.dataset.tableFilter] = field.value;
        tableState(resource).page = 1;
        renderApp();
      });
    });
  });

  root.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', () => {
      const resource = button.dataset.resource;
      tableState(resource).page = Number(button.dataset.page || 1);
      renderApp();
    });
  });
}

function filterRows(resource, rows) {
  const filters = tableState(resource);
  const q = normalizeSearch(filters.q);
  return rows.filter((row) => {
    if (q && !Object.values(row).some((value) => normalizeSearch(value).includes(q))) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.tier) {
      const tier = row.tier || row.card_tier;
      if (tier !== filters.tier) return false;
    }
    if (resource === 'transactions' && filters.from && String(row.created_at || '').slice(0, 10) < filters.from) return false;
    if (resource === 'transactions' && filters.to && String(row.created_at || '').slice(0, 10) > filters.to) return false;
    return true;
  });
}

function pagination(resource, page, totalPages, totalRows) {
  if (totalRows <= tableState(resource).pageSize) return '';
  return `
    <div class="pagination">
      <span>Trang ${page}/${totalPages}</span>
      <div>
        <button class="small-button ghost" type="button" data-resource="${resource}" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Truoc</button>
        <button class="small-button ghost" type="button" data-resource="${resource}" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>Sau</button>
      </div>
    </div>
  `;
}

function normalizeSearch(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function statusLabel(status) {
  const labels = {
    active: 'Hoat dong',
    inactive: 'Tam an',
    locked: 'Bi khoa',
    expired: 'Het han'
  };
  return labels[status] || status;
}

function exportButtons(resource) {
  return `
    <button class="ghost" type="button" data-action="export-excel" data-resource="${resource}">Excel</button>
    <button class="ghost" type="button" data-action="export-pdf" data-resource="${resource}">PDF</button>
  `;
}

function statsGrid(items) {
  return `
    <section class="stats-grid">
      ${items.map(([label, value]) => `
        <div class="stat-card">
          <div class="stat-icon">${iconForStat(label)}</div>
          <span>${escapeHtml(label)}</span>
          <strong>${value}</strong>
        </div>
      `).join('')}
    </section>
  `;
}

function table(rows, columns, actions) {
  if (!rows || !rows.length) {
    return '<div class="empty">Chưa có dữ liệu</div>';
  }
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            ${columns.map((column) => `<th>${escapeHtml(column[1])}</th>`).join('')}
            ${actions.length ? '<th></th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${columns.map(([key, , formatter]) => `<td>${formatter ? formatter(row[key], row) : escapeHtml(row[key] ?? '')}</td>`).join('')}
              ${actions.length ? `<td class="actions">${rowActions(row, actions)}</td>` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function exportData(resource, type) {
  const config = exportConfig(resource);
  if (!config || !config.rows.length) {
    toast('Chua co du lieu');
    return;
  }

  const html = exportTableHtml(config);
  if (type === 'excel') {
    downloadBlob(
      `memberhub-${config.fileName}.xls`,
      new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    );
    return;
  }

  const win = window.open('', '_blank', 'width=960,height=720');
  if (!win) {
    toast('Khong mo duoc cua so PDF', true);
    return;
  }
  win.document.write(`<!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(config.title)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #17221f; }
          h1 { font-size: 22px; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d9dfd9; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f2f5f2; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(config.title)}</h1>
        ${html}
      </body>
    </html>`);
  win.document.close();
  win.focus();
  win.print();
}

async function backupDatabase() {
  try {
    setLoading(true);
    const data = await api('/api/backup');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadBlob(
      `memberhub-backup-${stamp}.json`,
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
    );
    toast('Da tao file backup');
  } catch (error) {
    toast(error.message, true);
  } finally {
    setLoading(false);
  }
}

function exportConfig(resource) {
  const configs = {
    shops: ['Cua hang', 'shops', state.data?.shops || [], shopColumns()],
    users: ['Nguoi dung', 'users', state.data?.users || [], [
      ['name', 'Ho ten'],
      ['email', 'Email'],
      ['role', 'Vai tro', (value) => roleText[value] || value],
      ['shop_name', 'Cua hang'],
      ['phone', 'Dien thoai'],
      ['status', 'Trang thai']
    ]],
    customers: ['Khach hang', 'customers', state.data?.customers || [], customerColumns()],
    services: ['Dich vu', 'services', state.data?.services || [], serviceColumns()],
    cards: ['The thanh vien', 'cards', state.data?.cards || [], cardColumns()],
    transactions: ['Giao dich', 'transactions', state.data?.transactions || [], transactionColumns()],
    promotions: ['Uu dai', 'promotions', state.data?.promotions || [], promotionColumns()]
  };
  const config = configs[resource];
  if (!config) return null;
  return {
    title: config[0],
    fileName: config[1],
    rows: config[2],
    columns: config[3]
  };
}

function exportTableHtml(config) {
  return `
    <table>
      <thead>
        <tr>${config.columns.map((column) => `<th>${escapeHtml(exportCellText(column[1]))}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${config.rows.map((row) => `
          <tr>
            ${config.columns.map((column) => `<td>${escapeHtml(exportValue(row, column))}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function exportValue(row, column) {
  const [key, , formatter] = column;
  if (key === 'slug' && row.shop_slug && row.slug) return customerPublicUrl(row);
  if (key === 'slug' && row.slug) return shopPublicUrl(row);
  if (key === 'card_number' && column[1] === 'QR') return cardPublicUrl(row);
  const raw = row[key] ?? '';
  return exportCellText(formatter ? formatter(raw, row) : raw);
}

function exportCellText(value) {
  const element = document.createElement('div');
  element.innerHTML = String(value ?? '');
  return element.textContent.trim();
}

function downloadBlob(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function rowActions(row, actions) {
  return actions.map((action) => {
    if (action === 'edit') return `<button class="small-button ghost icon-button-text" type="button" data-action="open" data-resource="${resourceFromView()}" data-id="${row.id}">${svgIcon('edit')}<span>Sửa</span></button>`;
    if (action === 'delete') return `<button class="small-button danger icon-button-text" type="button" data-action="delete" data-resource="${resourceFromView()}" data-id="${row.id}">${svgIcon('trash')}<span>Xóa</span></button>`;
    if (action === 'buyService') return `<button class="small-button ghost icon-button-text" type="button" data-action="buy-service" data-id="${row.id}">${svgIcon('check')}<span>Mua</span></button>`;
    if (action === 'toggleShop') {
      const label = row.status === 'locked' ? 'Mở khóa' : 'Khóa';
      return `<button class="small-button ghost icon-button-text" type="button" data-action="toggle-shop" data-id="${row.id}">${svgIcon('lock')}<span>${label}</span></button>`;
    }
    if (action === 'toggleUser') {
      const label = row.status === 'locked' ? 'Mở khóa' : 'Khóa';
      return `<button class="small-button ghost icon-button-text" type="button" data-action="toggle-user" data-id="${row.id}">${svgIcon('lock')}<span>${label}</span></button>`;
    }
    return '';
  }).join(' ');
}

function resourceFromView() {
  const map = {
    shops: 'shop',
    shop: 'shop',
    users: 'user',
    customers: 'customer',
    services: 'service',
    cards: 'card',
    transactions: 'transaction',
    promotions: 'promotion'
  };
  return map[state.view];
}

function publicOrigin() {
  return window.location.origin.replace(/\/$/, '');
}

function shopPublicUrl(shop) {
  if (!shop?.slug) return '';
  return `${publicOrigin()}/${encodeURIComponent(shop.slug)}`;
}

function customerPublicUrl(customer) {
  if (!customer?.shop_slug || !customer?.slug) return '';
  return `${publicOrigin()}/${encodeURIComponent(customer.shop_slug)}/${encodeURIComponent(customer.slug)}`;
}

function publicLink(url) {
  if (!url) return '';
  return `
    <a class="copy-link compact link-chip" href="${escapeHtml(url)}" target="_blank" rel="noopener" title="${escapeHtml(url)}">
      ${svgIcon('link')}
      <span>Mo link</span>
    </a>
  `;
}

function cardPublicUrl(card) {
  if (card && typeof card === 'object' && card.shop_slug && card.customer_slug) {
    return customerPublicUrl({
      shop_slug: card.shop_slug,
      slug: card.customer_slug
    });
  }

  const cardNumber = typeof card === 'string' ? card : card?.card_number;
  if (!cardNumber) return '';
  return `${publicOrigin()}/m/${encodeURIComponent(cardNumber)}`;
}

function qrLink(card) {
  const url = cardPublicUrl(card);
  if (!url) return '';
  return `<a class="copy-link compact link-chip" href="${escapeHtml(url)}" target="_blank" rel="noopener">${svgIcon('link')}<span>Mở QR</span></a>`;
}

function qrImage(url, label = 'Mã QR thành viên') {
  if (!url) return '';
  return `<img class="qr-code" src="/api/qr?text=${encodeURIComponent(url)}" alt="${escapeHtml(label)}" loading="lazy">`;
}

function renderMembershipCard(card, shopName, qrUrl) {
  return `
    <div class="member-card has-qr">
      <div class="member-card-main">
        <div>
          <span>${escapeHtml(shopName || card.shop_name || '')}</span>
          <div class="number">${escapeHtml(card.card_number)}</div>
        </div>
        <div class="row">
          <div>
            <span>Điểm tích lũy</span>
            <strong>${number(card.points)}</strong>
          </div>
          <div>
            <span>Hạng</span>
            <strong>${escapeHtml(card.tier)}</strong>
          </div>
        </div>
        <div class="row">
          <div>
            <span>Ngày cấp</span>
            ${date(card.issued_at)}
          </div>
          <div>
            <span>Hạn thẻ</span>
            ${date(card.expires_at)}
          </div>
        </div>
      </div>
      <div class="qr-panel">
        ${qrImage(qrUrl)}
        <span>Quét để mở hồ sơ thẻ</span>
      </div>
    </div>
  `;
}

function renderNotices() {
  const notices = state.data?.notices || [];
  if (!notices.length) return '';

  return `
    <section class="notice-stack" aria-label="Thông báo">
      ${notices.map((notice) => `
        <article class="notice">
          <span>${escapeHtml(notice.shop_name || 'MemberHub')}</span>
          <strong>${escapeHtml(notice.title)}</strong>
          <p>${escapeHtml(notice.message)}</p>
        </article>
      `).join('')}
    </section>
  `;
}

function birthdayReminderPanel() {
  const reminders = state.data?.birthdayReminders || [];
  if (!reminders.length) return '';

  return panel('Sinh nhật sắp tới', 'Khách hàng có sinh nhật trong 7 ngày', `
    <div class="reminder-list">
      ${reminders.map((item) => `
        <article class="reminder-item">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.shop_name || '')}</span>
          </div>
          <div>
            <strong>${item.days_until === 0 ? 'Hôm nay' : `${number(item.days_until)} ngày nữa`}</strong>
            <span>${date(item.next_birthday)}${item.phone ? ` · ${escapeHtml(item.phone)}` : ''}</span>
          </div>
        </article>
      `).join('')}
    </div>
  `);
}

function shopColumns() {
  return [
    ['name', 'Tên cửa hàng'],
    ['slug', 'Đường dẫn', (_value, row) => publicLink(shopPublicUrl(row))],
    ['owner_name', 'Chủ cửa hàng'],
    ['phone', 'Điện thoại'],
    ['address', 'Địa chỉ'],
    ['status', 'Trạng thái', badge]
  ];
}

function customerColumns() {
  return [
    ['name', 'Khách hàng'],
    ['slug', 'Đường dẫn', (_value, row) => publicLink(customerPublicUrl(row))],
    ['shop_name', 'Cửa hàng'],
    ['email', 'Email'],
    ['phone', 'Điện thoại'],
    ['card_tier', 'Hạng', badge],
    ['card_points', 'Điểm', number],
    ['status', 'Trạng thái', badge]
  ];
}

function serviceColumns() {
  return [
    ['name', 'Dịch vụ'],
    ['shop_name', 'Cửa hàng'],
    ['price', 'Giá', currency],
    ['duration_minutes', 'Phút'],
    ['status', 'Trạng thái', badge]
  ];
}

function customerServiceColumns() {
  return [
    ['name', 'Dịch vụ'],
    ['shop_name', 'Cửa hàng'],
    ['price', 'Giá', currency],
    ['duration_minutes', 'Phút']
  ];
}

function purchasedServiceColumns() {
  return [
    ['created_at', 'Ngày mua', dateTime],
    ['service_name', 'Dịch vụ'],
    ['shop_name', 'Cửa hàng'],
    ['amount', 'Số tiền', currency],
    ['points_delta', 'Điểm', number]
  ];
}

function cardColumns() {
  return [
    ['card_number', 'Mã thẻ'],
    ['card_number', 'QR', (_value, row) => qrLink(row)],
    ['customer_name', 'Khách hàng'],
    ['shop_name', 'Cửa hàng'],
    ['points', 'Điểm', number],
    ['tier', 'Hạng', badge],
    ['status', 'Trạng thái', badge]
  ];
}

function transactionColumns() {
  return [
    ['created_at', 'Thời gian', dateTime],
    ['customer_name', 'Khách hàng'],
    ['shop_name', 'Cửa hàng'],
    ['service_name', 'Dịch vụ'],
    ['amount', 'Số tiền', currency],
    ['points_delta', 'Điểm', number]
  ];
}

function promotionColumns() {
  return [
    ['title', 'Ưu đãi'],
    ['shop_name', 'Cửa hàng'],
    ['discount_percent', 'Giảm', (value) => `${number(value)}%`],
    ['start_date', 'Bắt đầu', date],
    ['end_date', 'Kết thúc', date],
    ['status', 'Trạng thái', badge]
  ];
}

function openModal(resource, id) {
  const config = formConfig(resource, id);
  const modal = document.getElementById('modal-root');
  modal.innerHTML = `
    <div class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true">
        <header>
          <h3>${escapeHtml(config.title)}</h3>
          <button class="small-button ghost" type="button" data-close>Đóng</button>
        </header>
        <form id="modal-form">
          ${config.fields.map(renderField).join('')}
        </form>
        <footer>
          <button class="ghost" type="button" data-close>Hủy</button>
          <button class="primary" type="submit" form="modal-form">Lưu</button>
        </footer>
      </section>
    </div>
  `;
  modal.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', closeModal));
  modal.querySelector('#modal-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await saveResource(resource, id, await formPayload(event.currentTarget));
      closeModal();
      await refresh();
      toast('Đã lưu thay đổi');
    } catch (error) {
      toast(error.message, true);
    }
  });
  applyI18n(modal);
}

function renderField(field) {
  const value = field.value ?? '';
  const required = field.required ? 'required' : '';
  const full = field.full ? 'full' : '';
  if (field.type === 'select') {
    return `
      <label class="${full}">
        ${escapeHtml(field.label)}
        <select name="${field.name}" ${required}>
          ${(field.options || []).map((option) => `
            <option value="${escapeHtml(option.value)}" ${String(option.value) === String(value) ? 'selected' : ''}>${escapeHtml(option.label)}</option>
          `).join('')}
        </select>
      </label>
    `;
  }
  if (field.type === 'textarea') {
    return `
      <label class="${full}">
        ${escapeHtml(field.label)}
        <textarea name="${field.name}" ${required}>${escapeHtml(value)}</textarea>
      </label>
    `;
  }
  if (field.type === 'file') {
    return `
      <label class="${full}">
        ${escapeHtml(field.label)}
        <input name="${field.name}" type="file" accept="${escapeHtml(field.accept || 'image/*')}">
      </label>
    `;
  }
  return `
    <label class="${full}">
      ${escapeHtml(field.label)}
      <input name="${field.name}" type="${field.type || 'text'}" value="${escapeHtml(value)}" ${required}>
    </label>
  `;
}

function formConfig(resource, id) {
  const item = findItem(resource, id);
  const isAdmin = state.user.role === 'admin';
  const profile = state.data.profile || state.user || {};
  const shopOptions = optionList(state.data.shops || [], 'id', 'name', isAdmin ? 'Chọn cửa hàng' : null);
  const ownerOptions = ownerOptionList(state.data.users || [], item.owner_id);
  const customerOptions = optionList(state.data.customers || [], 'id', 'name');
  const serviceOptions = optionList(state.data.services || [], 'id', 'name', 'Không chọn');

  const configs = {
    shop: {
      title: id ? 'Cập nhật cửa hàng' : 'Thêm cửa hàng',
      fields: [
        field('name', 'Tên cửa hàng', item.name, true),
        field('slug', 'Đường dẫn cửa hàng', item.slug),
        field('phone', 'Điện thoại', item.phone),
        field('email', 'Email', item.email, false, 'email'),
        fileField('logo_file', 'Logo cửa hàng'),
        field('address', 'Địa chỉ', item.address, false, 'text', true),
        field('description', 'Mô tả', item.description, false, 'textarea', true),
        ...(isAdmin ? [
          selectField('owner_id', id ? 'Tài khoản chủ cửa hàng' : 'Gán tài khoản chủ có sẵn', item.owner_id, ownerOptions),
          selectField('status', 'Trạng thái', item.status || 'active', statusOptions(['active', 'locked'])),
          field('owner_name', 'Tạo chủ mới - họ tên', '', false),
          field('owner_email', 'Tạo chủ mới - email', '', false, 'email'),
          field('owner_password', 'Tạo chủ mới - mật khẩu', '', false, 'password')
        ] : [])
      ]
    },
    user: {
      title: id ? 'Cập nhật người dùng' : 'Thêm người dùng',
      fields: [
        ...(!id ? [selectField('role', 'Vai trò', item.role || 'owner', [
          { value: 'owner', label: 'Chủ cửa hàng' },
          { value: 'customer', label: 'Khách hàng' }
        ])] : []),
        field('name', 'Họ tên', item.name, true),
        field('email', 'Email', item.email, true, 'email'),
        field('phone', 'Điện thoại', item.phone),
        field('password', id ? 'Mật khẩu mới' : 'Mật khẩu', '', false, 'password'),
        selectField('status', 'Trạng thái', item.status || 'active', statusOptions(['active', 'locked'])),
        ...(!id ? [selectField('shop_id', 'Cửa hàng cho khách hàng', item.shop_id, shopOptions)] : [])
      ]
    },
    customer: {
      title: id ? 'Cập nhật khách hàng' : 'Thêm khách hàng',
      fields: [
        ...(isAdmin ? [selectField('shop_id', 'Cửa hàng', item.shop_id, shopOptions)] : []),
        field('name', 'Họ tên', item.name, true),
        field('slug', 'Đường dẫn khách hàng', item.slug),
        field('email', 'Email', item.email, false, 'email'),
        field('phone', 'Điện thoại', item.phone),
        field('birthday', 'Ngày sinh', item.birthday, false, 'date'),
        field('address', 'Địa chỉ', item.address, false, 'text', true),
        field('password', id ? 'Mật khẩu mới' : 'Mật khẩu đăng nhập', '', false, 'password'),
        selectField('status', 'Trạng thái', item.status || 'active', statusOptions(['active', 'locked']))
      ]
    },
    service: {
      title: id ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ',
      fields: [
        ...(isAdmin ? [selectField('shop_id', 'Cửa hàng', item.shop_id, shopOptions)] : []),
        field('name', 'Tên dịch vụ', item.name, true),
        field('price', 'Giá', item.price || 0, false, 'number'),
        field('duration_minutes', 'Thời lượng phút', item.duration_minutes || 30, false, 'number'),
        selectField('status', 'Trạng thái', item.status || 'active', statusOptions(['active', 'inactive'])),
        field('description', 'Mô tả', item.description, false, 'textarea', true)
      ]
    },
    card: {
      title: id ? 'Cập nhật thẻ' : 'Tạo thẻ thành viên',
      fields: [
        ...(!id ? [selectField('customer_id', 'Khách hàng', item.customer_id, customerOptions)] : []),
        field('points', 'Điểm tích lũy', item.points || 0, false, 'number'),
        selectField('tier', 'Hạng', item.tier || 'Silver', ['Silver', 'Gold', 'Platinum', 'Diamond'].map((tier) => ({ value: tier, label: tier }))),
        field('expires_at', 'Ngày hết hạn', item.expires_at, false, 'date'),
        selectField('status', 'Trạng thái', item.status || 'active', statusOptions(['active', 'locked', 'expired']))
      ]
    },
    transaction: {
      title: 'Tạo giao dịch',
      fields: [
        selectField('customer_id', 'Khách hàng', '', customerOptions),
        selectField('service_id', 'Dịch vụ', '', serviceOptions),
        field('amount', 'Số tiền', '', false, 'number'),
        field('points_delta', 'Điểm cộng/trừ', '', false, 'number'),
        field('note', 'Ghi chú', '', false, 'textarea', true)
      ]
    },
    promotion: {
      title: id ? 'Cập nhật ưu đãi' : 'Thêm ưu đãi',
      fields: [
        ...(isAdmin ? [selectField('shop_id', 'Cửa hàng', item.shop_id, shopOptions)] : []),
        field('title', 'Tên ưu đãi', item.title, true),
        field('discount_percent', 'Phần trăm giảm', item.discount_percent || 0, false, 'number'),
        field('start_date', 'Ngày bắt đầu', item.start_date, false, 'date'),
        field('end_date', 'Ngày kết thúc', item.end_date, false, 'date'),
        selectField('status', 'Trạng thái', item.status || 'active', statusOptions(['active', 'inactive'])),
        field('description', 'Mô tả', item.description, false, 'textarea', true)
      ]
    },
    profile: {
      title: 'Cập nhật hồ sơ',
      fields: [
        field('name', 'Họ tên', profile.name, true),
        field('email', 'Email', profile.email, true, 'email'),
        field('phone', 'Điện thoại', profile.phone),
        field('birthday', 'Ngày sinh', profile.birthday, false, 'date'),
        field('address', 'Địa chỉ', profile.address, false, 'text', true),
        field('password', 'Mật khẩu mới', '', false, 'password')
      ]
    }
  };

  return configs[resource];
}

function field(name, label, value, required = false, type = 'text', full = false) {
  return { name, label, value, required, type, full };
}

function fileField(name, label, accept = 'image/png,image/jpeg,image/webp,image/svg+xml', full = false) {
  return { name, label, accept, type: 'file', full };
}

function selectField(name, label, value, options, required = false) {
  return { name, label, value, options, required, type: 'select' };
}

function statusOptions(values) {
  const labels = {
    active: 'Hoạt động',
    inactive: 'Tạm ẩn',
    locked: 'Bị khóa',
    expired: 'Hết hạn'
  };
  return values.map((value) => ({ value, label: labels[value] || value }));
}

function optionList(rows, valueKey, labelKey, emptyLabel) {
  const options = (rows || []).filter(Boolean).map((row) => ({
    value: row[valueKey] ?? '',
    label: String(row[labelKey] || '') + (row.shop_name && labelKey !== 'shop_name' ? ` · ${row.shop_name}` : '')
  }));
  return emptyLabel ? [{ value: '', label: emptyLabel }, ...options] : options;
}

function ownerOptionList(users, currentOwnerId) {
  const seen = new Set();
  const owners = (users || [])
    .filter((user) => {
      if (!user || user.role === 'admin' || user.status === 'locked' || seen.has(user.id)) return false;
      seen.add(user.id);
      return !user.shop_id || Number(user.id) === Number(currentOwnerId);
    })
    .map((user) => ({
      value: user.id,
      label: user.email
        ? `${user.name} (${user.email}) - ${translatePhrase(roleText[user.role] || user.role)}`
        : `${user.name} - ${translatePhrase(roleText[user.role] || user.role)}`
    }));

  return [{ value: '', label: 'Chưa gán' }, ...owners];
}

function findItem(resource, id) {
  if (!id) return {};
  const map = {
    shop: state.data.shops,
    user: state.data.users,
    customer: state.data.customers,
    service: state.data.services,
    card: state.data.cards,
    promotion: state.data.promotions
  };
  return (map[resource] || []).find((item) => Number(item.id) === Number(id)) || {};
}

async function saveResource(resource, id, payload) {
  if (resource === 'profile') {
    await api('/api/customer/profile', { method: 'PUT', body: payload });
    return;
  }

  const endpoints = {
    shop: '/api/shops',
    user: '/api/users',
    customer: '/api/customers',
    service: '/api/services',
    card: '/api/cards',
    transaction: '/api/transactions',
    promotion: '/api/promotions'
  };
  const base = endpoints[resource];
  await api(id ? `${base}/${id}` : base, {
    method: id ? 'PUT' : 'POST',
    body: payload
  });
}

async function deleteResource(resource, id) {
  const ok = await confirmDelete('Xoa muc nay?', 'Du lieu da xoa se khong the khoi phuc trong ung dung.');
  if (!ok) return;
  const endpoints = {
    shop: '/api/shops',
    user: '/api/users',
    customer: '/api/customers',
    service: '/api/services',
    card: '/api/cards',
    transaction: '/api/transactions',
    promotion: '/api/promotions'
  };
  try {
    await api(`${endpoints[resource]}/${id}`, { method: 'DELETE' });
    await refresh();
    toast('Đã xóa');
  } catch (error) {
    toast(error.message, true);
  }
}

function confirmDelete(title, message) {
  const modal = document.getElementById('modal-root');
  modal.innerHTML = `
    <div class="modal-backdrop">
      <section class="modal confirm-modal" role="dialog" aria-modal="true">
        <header>
          <h3>${escapeHtml(title)}</h3>
          <button class="small-button ghost" type="button" data-confirm="cancel">Dong</button>
        </header>
        <div class="confirm-body">
          <p>${escapeHtml(message)}</p>
        </div>
        <footer>
          <button class="ghost" type="button" data-confirm="cancel">Huy</button>
          <button class="danger" type="button" data-confirm="ok">Xoa</button>
        </footer>
      </section>
    </div>
  `;
  return new Promise((resolve) => {
    modal.querySelectorAll('[data-confirm]').forEach((button) => {
      button.addEventListener('click', () => {
        const ok = button.dataset.confirm === 'ok';
        closeModal();
        resolve(ok);
      });
    });
  });
}

async function toggleShop(id) {
  const shop = state.data.shops.find((item) => Number(item.id) === Number(id));
  const status = shop.status === 'locked' ? 'active' : 'locked';
  try {
    await api(`/api/shops/${id}/status`, { method: 'PATCH', body: { status } });
    await refresh();
    toast(status === 'locked' ? 'Đã khóa cửa hàng' : 'Đã mở khóa cửa hàng');
  } catch (error) {
    toast(error.message, true);
  }
}

async function toggleUser(id) {
  const user = state.data.users.find((item) => Number(item.id) === Number(id));
  const status = user.status === 'locked' ? 'active' : 'locked';
  try {
    await api(`/api/users/${id}/status`, { method: 'PATCH', body: { status } });
    await refresh();
    toast(status === 'locked' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
  } catch (error) {
    toast(error.message, true);
  }
}

async function purchaseService(id) {
  const service = (state.data.services || []).find((item) => Number(item.id) === Number(id));
  if (!service) return;

  try {
    await api(`/api/customer/services/${id}/purchase`, { method: 'POST' });
    await refresh();
    toast(`Da mua dich vu: ${service.name}`);
  } catch (error) {
    toast(error.message, true);
  }
}

async function refresh() {
  state.data = await api('/api/app-data');
  renderApp();
  const customerRegisterFields = document.getElementById('customer-register-fields');
  if (customerRegisterFields && !customerRegisterFields.classList.contains('hidden')) {
    loadPublicShops();
  }
}

function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

async function loadPublicShops() {
  const registerShop = document.getElementById('register-shop');
  if (!registerShop) return;

  try {
    const data = await api('/api/public/shops', { auth: false });
    registerShop.innerHTML = data.shops
      .map((shop) => `<option value="${shop.id}">${escapeHtml(shop.name)}</option>`)
      .join('');
  } catch {
    registerShop.innerHTML = '';
  }
}

async function loadPublicPortal() {
  const view = document.getElementById('public-view');
  if (!view) return;

  renderLanguageControls();

  try {
    const data = await api(`/api/public/portal${window.location.pathname}`, { auth: false });
    document.title = data.type === 'customer'
      ? `${data.customer.name} - ${data.shop.name}`
      : `${data.shop.name} - MemberHub`;
    view.innerHTML = renderPublicPortal(data);
  } catch (error) {
    view.innerHTML = `
      <section class="public-shell">
        <div class="auth-brand">
          <span class="mark">M</span>
          <div>
            <h1 class="notranslate" translate="no">MemberHub</h1>
            <p>Không tìm thấy đường dẫn này</p>
          </div>
        </div>
        <div class="empty">${escapeHtml(error.message)}</div>
      </section>
    `;
  }

  renderLanguageControls();
  applyI18n(view);
}

function renderPublicPortal(data) {
  if (data.type === 'customer') return renderPublicCustomerPortal(data);
  return renderPublicShopPortal(data);
}

function renderPublicShopPortal(data) {
  const shop = data.shop;
  return `
    <section class="public-shell">
      <header class="public-hero">
        <div class="auth-brand">
          ${shop.logo_data_url ? `<img class="brand-logo" src="${escapeHtml(shop.logo_data_url)}" alt="Logo">` : '<span class="mark">M</span>'}
          <div>
            <p class="role-kicker notranslate" translate="no">MemberHub</p>
            <h1>${escapeHtml(shop.name)}</h1>
          </div>
        </div>
        <div class="public-meta">
          ${shop.phone ? `<span>${escapeHtml(shop.phone)}</span>` : ''}
          ${shop.email ? `<span>${escapeHtml(shop.email)}</span>` : ''}
          ${shop.address ? `<span>${escapeHtml(shop.address)}</span>` : ''}
        </div>
        ${shop.description ? `<p>${escapeHtml(shop.description)}</p>` : ''}
      </header>

      <div class="split-grid">
        ${panel('Dịch vụ', 'Danh sách dịch vụ đang hoạt động', publicList(data.services, (service) => `
          <article class="public-item">
            <strong>${escapeHtml(service.name)}</strong>
            <span>${currency(service.price)} · ${number(service.duration_minutes)} phút</span>
            ${service.description ? `<p>${escapeHtml(service.description)}</p>` : ''}
          </article>
        `))}
        ${panel('Ưu đãi', 'Chương trình đang áp dụng', publicList(data.promotions, (promo) => `
          <article class="public-item">
            <strong>${escapeHtml(promo.title)}</strong>
            <span>${number(promo.discount_percent)}%</span>
            ${promo.description ? `<p>${escapeHtml(promo.description)}</p>` : ''}
          </article>
        `))}
      </div>
    </section>
  `;
}

function renderPublicCustomerPortal(data) {
  const card = (data.cards || [])[0];
  const customerUrl = customerPublicUrl({
    shop_slug: data.shop.slug,
    slug: data.customer.slug
  });

  return `
    <section class="public-shell">
      <header class="public-hero">
        <div class="auth-brand">
          ${data.shop.logo_data_url ? `<img class="brand-logo" src="${escapeHtml(data.shop.logo_data_url)}" alt="Logo">` : '<span class="mark">M</span>'}
          <div>
            <p class="role-kicker">${escapeHtml(data.shop.name)}</p>
            <h1>${escapeHtml(data.customer.name)}</h1>
          </div>
        </div>
        <div class="public-meta">
          ${data.customer.phone ? `<span>${escapeHtml(data.customer.phone)}</span>` : ''}
          ${data.customer.email ? `<span>${escapeHtml(data.customer.email)}</span>` : ''}
        </div>
      </header>

      ${card ? renderMembershipCard(card, data.shop.name, customerUrl || cardPublicUrl(card)) : '<div class="empty">Chưa có thẻ thành viên</div>'}

      <div class="split-grid">
        ${panel('Lịch sử giao dịch', 'Giao dịch gần đây', publicList(data.transactions, (tx) => `
          <article class="public-item">
            <strong>${escapeHtml(tx.service_name || 'Giao dịch')}</strong>
            <span>${dateTime(tx.created_at)} · ${currency(tx.amount)} · ${number(tx.points_delta)} điểm</span>
            ${tx.note ? `<p>${escapeHtml(tx.note)}</p>` : ''}
          </article>
        `))}
        ${panel('Ưu đãi', 'Chương trình đang áp dụng', publicList(data.promotions, (promo) => `
          <article class="public-item">
            <strong>${escapeHtml(promo.title)}</strong>
            <span>${number(promo.discount_percent)}%</span>
            ${promo.description ? `<p>${escapeHtml(promo.description)}</p>` : ''}
          </article>
        `))}
      </div>
    </section>
  `;
}

function publicList(rows, renderer) {
  if (!rows || !rows.length) return '<div class="empty">Chưa có dữ liệu</div>';
  return `<div class="public-list">${rows.map(renderer).join('')}</div>`;
}

function isDictionaryLanguage(language) {
  return language === 'vi' || Boolean(translations[language]);
}

function isGoogleTranslateLanguage(language) {
  return Boolean(googleTranslateLanguages[language]);
}

function currentLanguage() {
  const saved = localStorage.getItem('memberhub_language');
  if (languages[saved]) return saved;

  const browserLanguage = (navigator.language || '').slice(0, 2).toLowerCase();
  return dictionaryLanguages[browserLanguage] ? browserLanguage : 'vi';
}

function renderLanguageOptions(options) {
  return Object.entries(options).map(([value, label]) => `
    <option value="${value}" ${value === currentLanguage() ? 'selected' : ''}>${label}</option>
  `).join('');
}

function renderLanguageControls() {
  const mount = document.querySelector('.account') || document.querySelector('.auth-panel') || document.querySelector('.entry-panel') || document.querySelector('.public-shell');
  if (!mount || mount.querySelector('.language-switcher')) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'language-switcher';
  wrapper.innerHTML = `
    <span>Ngôn ngữ</span>
    <button class="language-button" type="button" aria-haspopup="listbox" aria-expanded="false">
      <span class="language-current">${escapeHtml(languages[currentLanguage()] || 'Tiếng Việt')}</span>
      ${svgIcon('chevron')}
    </button>
    <div class="language-menu" role="listbox">
      ${Object.entries(languages).map(([value, label]) => `
        <button class="language-option ${value === currentLanguage() ? 'active' : ''}" type="button" role="option" data-language="${value}" aria-selected="${value === currentLanguage() ? 'true' : 'false'}">
          <span>${escapeHtml(label)}</span>
          ${value === currentLanguage() ? svgIcon('check') : ''}
        </button>
      `).join('')}
    </div>
  `;

  const logoutButton = mount.querySelector('#logout-button');
  if (logoutButton) {
    mount.insertBefore(wrapper, logoutButton);
  } else {
    mount.appendChild(wrapper);
  }

  const button = wrapper.querySelector('.language-button');
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = wrapper.classList.toggle('open');
    button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  wrapper.querySelectorAll('[data-language]').forEach((option) => {
    option.addEventListener('click', () => changeLanguage(option.dataset.language));
  });
}

function changeLanguage(nextLanguage) {
  const previousLanguage = currentLanguage();
  localStorage.setItem('memberhub_language', nextLanguage);

  if (isGoogleTranslateLanguage(nextLanguage)) {
    setGoogleTranslateCookie(nextLanguage);
    if (isDictionaryLanguage(previousLanguage)) {
      window.location.reload();
      return;
    }
    requestGoogleTranslate(nextLanguage);
    syncLanguageControls();
    return;
  }

  clearGoogleTranslateCookie();
  window.location.reload();
}

function syncLanguageControls() {
  document.querySelectorAll('.language-switcher').forEach((wrapper) => {
    const language = currentLanguage();
    wrapper.querySelector('.language-current').textContent = languages[language] || 'Tiếng Việt';
    wrapper.querySelectorAll('[data-language]').forEach((option) => {
      const active = option.dataset.language === language;
      option.classList.toggle('active', active);
      option.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  });
}

document.addEventListener('click', () => {
  document.querySelectorAll('.language-switcher.open').forEach((wrapper) => {
    wrapper.classList.remove('open');
    wrapper.querySelector('.language-button')?.setAttribute('aria-expanded', 'false');
  });
});

function ensureThemeButton() {
  const account = document.querySelector('.account');
  const logout = document.getElementById('logout-button');
  if (!account || !logout || document.getElementById('theme-toggle')) return;
  const button = document.createElement('button');
  button.id = 'theme-toggle';
  button.className = 'ghost';
  button.type = 'button';
  button.textContent = currentTheme() === 'dark' ? 'Light' : 'Dark';
  button.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem('memberhub_theme', next);
    applyTheme();
    button.textContent = next === 'dark' ? 'Light' : 'Dark';
  });
  account.insertBefore(button, logout);
}

function enhanceBrandBlock() {
  const brand = document.querySelector('.sidebar .brand');
  if (!brand || brand.querySelector('.brand-meta')) return;
  const meta = document.createElement('div');
  meta.className = 'brand-meta';
  meta.innerHTML = `
    <span>${svgIcon('shield')} Secure</span>
    <span>${svgIcon('sparkles')} Pro</span>
  `;
  brand.appendChild(meta);
}

function currentTheme() {
  return localStorage.getItem('memberhub_theme') === 'dark' ? 'dark' : 'light';
}

function applyTheme() {
  document.documentElement.dataset.theme = currentTheme();
}

function applyI18n(root = document.body) {
  const language = currentLanguage();
  document.documentElement.lang = language;

  syncLanguageControls();

  if (isGoogleTranslateLanguage(language)) {
    requestGoogleTranslate(language);
    return;
  }

  if (language === 'vi' || !root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION'].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach((node) => {
    const original = node.nodeValue;
    const trimmed = original.trim();
    const translated = translatePhrase(trimmed, language);
    if (translated !== trimmed) {
      node.nodeValue = original.replace(trimmed, translated);
    }
  });

  root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((input) => {
    input.placeholder = translatePhrase(input.placeholder, language);
  });

  root.querySelectorAll('[aria-label]').forEach((element) => {
    element.setAttribute('aria-label', translatePhrase(element.getAttribute('aria-label'), language));
  });

  root.querySelectorAll('option').forEach((option) => {
    option.textContent = translatePhrase(option.textContent.trim(), language);
  });
}

function translatePhrase(text, language = currentLanguage()) {
  if (!text || language === 'vi' || isGoogleTranslateLanguage(language)) return text || '';
  const dictionary = translations[language] || {};
  if (dictionary[text]) return dictionary[text];

  if (text.startsWith('Tổng số:')) {
    return `${dictionary['Tổng số'] || 'Total'}:${text.slice('Tổng số:'.length)}`;
  }

  return text;
}

function ensureGoogleTranslateHost() {
  let host = document.getElementById('google-translate-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'google-translate-host';
    host.className = 'google-translate-host';
    document.body.appendChild(host);
  }
  return host;
}

function waitForGoogleTranslateCombo() {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      const combo = document.querySelector('.goog-te-combo');
      if (combo || attempts >= 80) {
        resolve(combo || null);
        return;
      }
      attempts += 1;
      window.setTimeout(check, 100);
    };
    check();
  });
}

function ensureGoogleTranslate() {
  const combo = document.querySelector('.goog-te-combo');
  if (combo) return Promise.resolve(combo);
  if (googleTranslateLoadPromise) return googleTranslateLoadPromise;

  googleTranslateLoadPromise = new Promise((resolve) => {
    ensureGoogleTranslateHost();

    window.googleTranslateElementInit = () => {
      if (!googleTranslateInitialized && window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement({
          pageLanguage: googleTranslatePageLanguage,
          includedLanguages: Object.keys(googleTranslateLanguages).join(','),
          autoDisplay: false
        }, 'google-translate-host');
        googleTranslateInitialized = true;
      }
      waitForGoogleTranslateCombo().then(resolve);
    };

    if (window.google?.translate?.TranslateElement) {
      window.googleTranslateElementInit();
      return;
    }

    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    }
  });

  return googleTranslateLoadPromise;
}

function googleTranslateCookieDomains() {
  const hostname = window.location.hostname;
  if (!hostname || hostname === 'localhost' || /^[\d.]+$/.test(hostname)) return [''];

  const domains = ['', hostname];
  const parts = hostname.split('.');
  if (parts.length > 2) domains.push(`.${parts.slice(-2).join('.')}`);
  return [...new Set(domains)];
}

function writeGoogleTranslateCookie(value, maxAge) {
  googleTranslateCookieDomains().forEach((domain) => {
    const domainPart = domain ? `; domain=${domain}` : '';
    document.cookie = `googtrans=${value}; path=/; max-age=${maxAge}; SameSite=Lax${domainPart}`;
  });
}

function setGoogleTranslateCookie(language) {
  writeGoogleTranslateCookie(`/${googleTranslatePageLanguage}/${language}`, 31536000);
}

function clearGoogleTranslateCookie() {
  writeGoogleTranslateCookie('', 0);
}

function requestGoogleTranslate(language = currentLanguage()) {
  if (!isGoogleTranslateLanguage(language)) return;
  document.documentElement.lang = language;
  setGoogleTranslateCookie(language);

  ensureGoogleTranslate().then((combo) => {
    if (!combo) return;
    combo.value = language;
    combo.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function redirectToRole(role) {
  const pages = {
    admin: '/admin.html',
    owner: '/owner.html',
    customer: '/customer.html'
  };
  window.location.href = pages[role] || '/index.html';
}

function loginPageForRole(role) {
  const pages = {
    admin: '/admin-login.html',
    owner: '/owner-login.html',
    customer: '/customer-login.html'
  };
  return pages[role] || '/index.html';
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const useAuth = options.auth !== false;
  if (useAuth && state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  if (options.loading !== false) setLoading(true);
  try {
    const response = await fetch(path, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Yêu cầu không thành công');
    }
    return data;
  } finally {
    if (options.loading !== false) setLoading(false);
  }
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function formPayload(form) {
  const payload = {};
  const data = new FormData(form);
  for (const [key, value] of data.entries()) {
    if (value instanceof File) {
      if (!value.name || value.size === 0) continue;
      if (!value.type.startsWith('image/')) throw new Error('Logo phai la file hinh anh');
      if (value.size > 500 * 1024) throw new Error('Logo toi da 500KB');
      payload.logo_data_url = await fileToDataUrl(value);
      continue;
    }
    payload[key] = value;
  }
  return payload;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Khong doc duoc file logo'));
    reader.readAsDataURL(file);
  });
}

function badge(value) {
  const labels = {
    active: 'Hoạt động',
    inactive: 'Tạm ẩn',
    locked: 'Bị khóa',
    expired: 'Hết hạn',
    Silver: 'Silver',
    Gold: 'Gold',
    Platinum: 'Platinum',
    Diamond: 'Diamond'
  };
  const dangerValues = ['locked', 'expired'];
  const warnValues = ['inactive', 'Gold', 'Platinum'];
  const className = dangerValues.includes(value) ? 'danger' : warnValues.includes(value) ? 'warn' : '';
  return `<span class="badge ${className}">${escapeHtml(labels[value] || value || '')}</span>`;
}

function currency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0));
}

function date(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
}

function dateTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value.replace(' ', 'T')));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

let loadingCount = 0;
function setLoading(isLoading) {
  loadingCount += isLoading ? 1 : -1;
  loadingCount = Math.max(0, loadingCount);
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay hidden';
    overlay.innerHTML = '<div><span class="spinner"></span><strong>Dang xu ly...</strong></div>';
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('hidden', loadingCount === 0);
}

let toastTimer = null;
function toast(message, isError = false) {
  const element = document.getElementById('toast');
  element.textContent = translatePhrase(message);
  element.classList.toggle('error', isError);
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 2600);
}
