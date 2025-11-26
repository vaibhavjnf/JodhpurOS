export interface MenuItem {
  name: string;
  price: number;
  category: string;
  variations?: string[]; // Variations/Misspellings for AI training
}

export const SHOP_MENU: MenuItem[] = [
  // --- Hot Items & Snacks (High Frequency) ---
  { 
    name: "Samosa", 
    price: 10, 
    category: "KACHORI",
    variations: ["samose", "samosa", "aloovada samosa", "singhara", "samosas", "samosaa"] 
  },
  { 
    name: "Kachori", 
    price: 30, 
    category: "KACHORI",
    variations: ["kachori", "kachodi", "khasta", "pyaaz kachori", "pyaz wali", "kanda kachori", "moti wali", "kachoris", "kachoriyan"]
  },
  { 
    name: "Dal Kachori", 
    price: 15, 
    category: "KACHORI",
    variations: ["dal kachori", "moong dal", "choti kachori", "bina pyaaz ki", "sadi kachori", "plain kachori"]
  },
  { 
    name: "Aloovada", 
    price: 15, 
    category: "KACHORI",
    variations: ["aloo vada", "batata vada", "bada", "aloo bonda", "vada"]
  },
  { 
    name: "Mirchi Vada", 
    price: 25, 
    category: "KACHORI",
    variations: ["mirchi vada", "mirchi bada", "jodhpur mirchi", "badi mirchi"]
  },
  { 
    name: "Lassan Kofta", 
    price: 20, 
    category: "KACHORI",
    variations: ["lassan kofta", "kofta", "lahsun kofta", "garlic kofta"]
  },
  { name: "Khaman 1kg", price: 300, category: "KACHORI", variations: ["khaman", "dhokla", "khaman dhokla"] },
  { name: "Khaman 250gm", price: 75, category: "KACHORI", variations: ["khaman pav", "khaman 250"] },
  { name: "Khaman 1 Plate", price: 30, category: "KACHORI", variations: ["khaman plate", "khaman ki plate"] },
  { name: "Dhona", price: 1, category: "KACHORI", variations: ["dhona", "pattal", "plate", "khali bowl"] },
  { name: "Small Chutney", price: 5, category: "KACHORI", variations: ["chutney", "chatni", "extra chutney", "meethi chatni", "khatti chatni"] },
  
  // --- Sweets (High Value) ---
  { 
    name: "Jalebi 1kg", 
    price: 440, 
    category: "JALEBI",
    variations: ["jalebi", "sweet", "kesar jalebi", "1 kilo jalebi"]
  },
  { 
    name: "Imarti 1kg", 
    price: 500, 
    category: "JALEBI",
    variations: ["imarti", "jangri", "moti jalebi", "imarati"]
  },
  { name: "Jalebi 1 Plate", price: 45, category: "JALEBI", variations: ["jalebi plate", "thodi jalebi"] },
  { name: "Imarti 1 Plate", price: 50, category: "JALEBI", variations: ["imarti plate"] },
  { name: "Sweets", price: 400, category: "SWEETS", variations: ["mithai", "box", "mithai ka dabba"] },

  // --- Namkeen (Packaged) ---
  { name: "Namkeen 1 Kg", price: 300, category: "NAMKEEN 1 KG", variations: ["namkeen", "mixture", "sev", "bhujia"] }, 
  { name: "SEB BOONDI MIX (1 KG)", price: 300, category: "NAMKEEN 1 KG", variations: ["seb boondi", "boondi mix"] },
  { name: "FEEKI PAPDI (1 KG)", price: 280, category: "NAMKEEN 1 KG", variations: ["feeki papdi", "papdi"] },
  { name: "GATHIYA (1 KG)", price: 280, category: "NAMKEEN 1 KG", variations: ["gathiya", "ganthiya"] },
  { name: "SAFED SEB (1 KG)", price: 280, category: "NAMKEEN 1 KG", variations: ["safed sev", "white sev"] },
  { name: "KADKE (1 KG)", price: 280, category: "NAMKEEN 1 KG", variations: ["kadke"] },
  { name: "LAHSUN SEB (1 KG)", price: 300, category: "NAMKEEN 1 KG", variations: ["lahsun sev", "garlic sev"] },
  { name: "PODINA SEB (1 KG)", price: 300, category: "NAMKEEN 1 KG", variations: ["podina sev", "mint sev"] },
  { name: "BHAV NAGRI (1 KG)", price: 280, category: "NAMKEEN 1 KG", variations: ["bhavnagri", "bhav nagari"] },
  { name: "NAI SEB (1 KG)", price: 280, category: "NAMKEEN 1 KG", variations: ["nai sev", "nylon sev"] },
  { name: "HARA MIX (1 KG)", price: 320, category: "NAMKEEN 1 KG", variations: ["hara mix", "green mix"] },
  { name: "FALHARI SABUDANA (1 KG)", price: 320, category: "NAMKEEN 1 KG", variations: ["sabudana", "falhari"] },
  { name: "KAJU MIXTURE (1 KG)", price: 320, category: "NAMKEEN 1 KG", variations: ["kaju mix", "cashew mix"] },
  { name: "MASALA MIX (1 KG)", price: 280, category: "NAMKEEN 1 KG", variations: ["masala mix"] },
  { name: "KHATTA MEETHA MIX (1 KG)", price: 300, category: "NAMKEEN 1 KG", variations: ["khatta meetha"] },
  
  // Drinks & Misc
  { name: "Lassi", price: 60, category: "DRINKS", variations: ["lassi", "chas", "chaach", "buttermilk"] },
  { name: "Water Bottle Small", price: 10, category: "DRINKS", variations: ["pani", "water", "choti botal", "paani"] },
  { name: "Water Bottle", price: 20, category: "DRINKS", variations: ["pani ki bottle", "bisleri", "badi bottle"] },
];