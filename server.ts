import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Mock data store
interface StoreStatus {
  connected: boolean;
  apiKey: string;
  url: string;
  sales: number;
  productsCount: number;
}

interface ConnectedStores {
  shopify: StoreStatus;
  amazon: StoreStatus;
  ebay: StoreStatus;
  tiktok: StoreStatus;
}

interface Product {
  id: string;
  title: string;
  price: number;
  image: string;
  tags: string[];
  description: string;
  keywords: string;
  seoText: string;
  stores: {
    shopify: "published" | "draft" | "pending";
    amazon: "published" | "draft" | "pending";
    ebay: "published" | "draft" | "pending";
    tiktok: "published" | "draft" | "pending";
  };
  createdAt: string;
}

interface TrendItem {
  id: string;
  title: string;
  category: string;
  demandScore: number; // 1-100
  avgSellingPrice: number;
  source: string; // e.g. "TikTok Tech Trends", "Shopify Hot Products"
  tags: string[];
  bossQuote: string; // "Boss, buy this now! It's a goldmine."
  imageSearchTerm: string;
}

// Initial mockup data
const defaultStores: ConnectedStores = {
  shopify: { connected: true, apiKey: "shpat_xxxxxxxxxxxxxxxxx", url: "my-boss-store.myshopify.com", sales: 12450.0, productsCount: 15 },
  amazon: { connected: true, apiKey: "amzn_key_xxxxxxxxxxxxxxxx", url: "sellercentral.amazon.com/boss", sales: 34100.0, productsCount: 8 },
  ebay: { connected: false, apiKey: "", url: "ebay.com/usr/boss-deals", sales: 0.0, productsCount: 0 },
  tiktok: { connected: true, apiKey: "tt_shop_xxxxxxxxxxxxxxxx", url: "seller-us.tiktok.com/boss_hq", sales: 8120.0, productsCount: 12 }
};

let userStores: ConnectedStores = { ...defaultStores };

let products: Product[] = [
  {
    id: "prod-1",
    title: "RGB Mechanical Keyboard - Premium Red Switches",
    price: 89.99,
    image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400&auto=format&fit=crop&q=60",
    tags: ["keyboard", "gaming", "rgb", "ergonomic"],
    description: "Upgrade your typing experience with this ultra-responsive mechanical keyboard. Featuring tactical hot-swappable linear red switches, vibrant per-key customizable RGB backlighting, and a heavy-duty anodized aluminum frame, it is built to survive both late-night coding sessions and highly competitive gaming tournaments.",
    keywords: "rgb mechanical keyboard, linear gaming keyboard, hot swappable red switches, ergonomic mechanical keyboard, professional typist gear",
    seoText: "Meta Title: RGB Mechanical Keyboard with Hot-Swappable linear switches\nMeta Description: Purchase the ultimate tactical mechanical gaming keyboard featuring brilliant custom RGB lights and premium linear switches. Perfect for developers and esports masters.",
    stores: {
      shopify: "published",
      amazon: "published",
      ebay: "draft",
      tiktok: "published"
    },
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
  },
  {
    id: "prod-2",
    title: "Hi-Res ANC Hybrid Wireless Headphones",
    price: 159.00,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=60",
    tags: ["audio", "headphones", "anc", "wireless"],
    description: "Lock out external noise and delve into studio-grade acoustics. The hybrid active noise cancellation technology adjusts dynamically to your environment, while oversized 40mm custom titanium drivers offer punchy high-fidelity bass and crisp Trebles. Up to 60-hours of non-stop battery life ensures your soundtrack never skips a beat.",
    keywords: "active noise cancelling headphones, hybrid wireless anc, high resolution audio bluetooth, 60h playback headphones, titanium drivers audio",
    seoText: "Meta Title: Wireless Active Noise Cancelling Headphones - Premium ANC\nMeta Description: Immerse yourself in audio bliss. Equipped with hybrid active noise cancellation, custom 40mm drivers, and an outstanding 60-hour playtime.",
    stores: {
      shopify: "published",
      amazon: "pending",
      ebay: "draft",
      tiktok: "draft"
    },
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

// Lazy Gemini Client Initialization
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.includes("MY_GEMINI_API_KEY")) {
      console.warn("GEMINI_API_KEY isn't configured in environment. Using robust mock generators.");
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiInstance;
}

// AI: Automatically generate Description, Keywords, and SEO meta text
app.post("/api/products/generate-seo", async (req, res) => {
  const { title, price, tags, image } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Product title is required" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Return high-quality, smart simulated template content if API Key is not set or invalid
    const listTags = (tags || []).join(", ");
    const simulatedDescription = `Experience unmatched performance with the newly released ${title}! Expertly designed for modern lifestyles, this product blends premium durability with innovative technology. Retailing at just $${price || 'XX.XX'}, it supports essential features customized for developers, creators, and hobbyists alike. Dynamic tags include: ${listTags}. Enjoy rapid setup, eco-friendly materials, and outstanding support.`;
    const simulatedKeywords = `${title.toLowerCase()}, best ${title.toLowerCase()}, online e-commerce ${tags?.[0] || 'product'}, premium ${tags?.[1] || 'item'}, retail ${title.split(' ')[0] || 'deal'}`;
    const simulatedSeoText = `Meta Title: Buy ${title} Online | High Quality ${tags?.[0] || 'Product'}\nMeta Description: Get the absolute best deals on our brand-new ${title}. Built for longevity, comfort, and professional performance. Order yours today with express shipping!`;
    const bossReview = `Boss, listen to me on this: this "${title}" is going to fly off the shelves! The retail market has a hot spot for tags like [${listTags}]. We priced it at $${price || '99.00'} which gives us a beautiful net margin. Let's auto-upload this and start raking in the cash!`;

    return res.json({
      description: simulatedDescription,
      keywords: simulatedKeywords,
      seoText: simulatedSeoText,
      bossQuote: bossReview
    });
  }

  try {
    const prompt = `You are a world-class e-commerce growth hacker, copywriter, and professional merchant.
    I want to list a product on my Shopify, Amazon, eBay, and TikTok Shop stores.
    Please generate the following fields:
    1. A premium, high-converting product description (detailed, informative, engaging, approximately 100-150 words).
    2. A comma-separated list of highly searchable e-commerce index keywords.
    3. Standard SEO Optimization Text containing Meta Title and Meta Description.
    4. A personal 'Boss Butler' funny, confident quote speaking to me like: 'Boss, buy this...' or 'Boss, prepare the warehouse...'. Talk like a professional but highly informal Butler-Assistant who wants us to get rich.

    Here is the product info:
    - Title: "${title}"
    - Target retail price: $${price}
    - Keywords / tags: ${JSON.stringify(tags)}

    Return a clean JSON object containing EXACTLY these fields:
    {
      "description": "...",
      "keywords": "...",
      "seoText": "...",
      "bossQuote": "..."
    }`;

    // Basic Text Task model: gemini-3.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "Engaging product description" },
            keywords: { type: Type.STRING, description: "Comma-separated search keywords" },
            seoText: { type: Type.STRING, description: "SEO title and meta details" },
            bossQuote: { type: Type.STRING, description: "Funny, bossy growth hacker butler quote starting with Boss" }
          },
          required: ["description", "keywords", "seoText", "bossQuote"]
        }
      }
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    res.json(parsedData);
  } catch (err: any) {
    console.error("Gemini API SEO Generation Error, returning fallback:", err);
    // Return high-quality, smart simulated template content if API behaves unexpectedly or rate-limited
    const listTags = (tags || []).join(", ");
    const simulatedDescription = `Experience unmatched performance with the newly released ${title}! Expertly designed for modern lifestyles, this product blends premium durability with innovative technology. Retailing at just $${price || 'XX.XX'}, it supports essential features customized for developers, creators, and hobbyists alike. Dynamic tags include: ${listTags}. Enjoy rapid setup, eco-friendly materials, and outstanding support.`;
    const simulatedKeywords = `${title.toLowerCase()}, best ${title.toLowerCase()}, online e-commerce ${tags?.[0] || 'product'}, premium ${tags?.[1] || 'item'}, retail ${title.split(' ')[0] || 'deal'}`;
    const simulatedSeoText = `Meta Title: Buy ${title} Online | High Quality ${tags?.[0] || 'Product'}\nMeta Description: Get the absolute best deals on our brand-new ${title}. Built for longevity, comfort, and professional performance. Order yours today with express shipping!`;
    const bossReview = `Boss, listen to me on this: this "${title}" is going to fly off the shelves! The retail market has a hot spot for tags like [${listTags}]. We priced it at $${price || '99.00'} which gives us a beautiful net margin. Let's auto-upload this and start raking in the cash!`;

    res.json({
      description: simulatedDescription,
      keywords: simulatedKeywords,
      seoText: simulatedSeoText,
      bossQuote: bossReview
    });
  }
});

// AI: Analyzes uploaded image, gets product title, suggested price, tags, description, keywords, bossQuote
app.post("/api/products/analyze-image", async (req, res) => {
  const { base64Data, mimeType } = req.body;
  if (!base64Data) {
    return res.status(400).json({ error: "Missing uploaded image bytes." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Elegant fallback simulation
    const simulatedTitle = "AuraSphere Minimalist Ambient Orb";
    const simulatedPrice = 64.99;
    const simulatedTags = ["ambiance", "orb", "aesthetic", "smart-home"];
    const simulatedDescription = "Elevate your workspace with this luxury hand-blown AuraSphere glass ambient lighting solution. Crafted to simulate natural solar and lunar luminescence rhythms, the sphere supports infinite customized rgb colors, soothing pulsing modes, and acts as an elegant physical centerpiece. Built for modern offices, wellness rooms, and luxury bedside setups.";
    const simulatedKeywords = "ambient glass sphere, halo rgb desktop accessory, hand blown luxury lamp, calming office zen light, smart circadian clock rhythm";
    const simulatedSeoText = "Meta Title: AuraSphere Hand-Blown Glass Ambient Desktop Light\nMeta Description: Discover luxury circadian lighting. AuraSphere offers dynamic rgb glow rhythms, physical elegance, smart desk setup focus, and relaxation ranges.";
    const simulatedBossQuote = "Boss, stop searching! Circus lighting is trending globally. This high-margin hand-crafted orb sells for $64.99 with over 80% markups. Let's list it right now and secure the sales!";

    return res.json({
      title: simulatedTitle,
      price: simulatedPrice,
      tags: simulatedTags,
      description: simulatedDescription,
      keywords: simulatedKeywords,
      seoText: simulatedSeoText,
      bossQuote: simulatedBossQuote
    });
  }

  try {
    const prompt = `You are an expert retail growth hacker, product manager, and professional copywriter.
    Analyze this uploaded product photo and generate a highly converting sales listing catalog.
    Return a clean JSON object containing EXACTLY these fields:
    {
      "title": "A short, catchy, professional retail product name (e.g. Ergonomic Leather Desk Mat)",
      "price": a realistic suggested retail price as a number (e.g. 39.99),
      "tags": ["an", "array", "of", "4", "to", "5", "lowercase", "search", "tags"],
      "description": "Engaging, high-converting detailed product narrative describing features and premium aesthetics (approximately 100-150 words in length)",
      "keywords": "comma-separated list of highly searchable index keyword tags for retail platforms",
      "seoText": "Meta Title and Meta Description optimal for Search Engine listing tags",
      "bossQuote": "A funny, highly enthusiastic Butler assistant quote praising you saying 'Boss, buy this...' or 'Boss, the warehouses are fully prepared' based on your scan!"
    }`;

    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: cleanBase64
      }
    };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            price: { type: Type.NUMBER },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            description: { type: Type.STRING },
            keywords: { type: Type.STRING },
            seoText: { type: Type.STRING },
            bossQuote: { type: Type.STRING }
          },
          required: ["title", "price", "tags", "description", "keywords", "seoText", "bossQuote"]
        }
      }
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    res.json(parsedData);
  } catch (err: any) {
    console.error("Gemini Multimodal Vision Error, returning fallback:", err);
    // fallback anyway so the client never crashes
    res.json({
      title: "Smart Premium Multi-Grip Wireless Mouse",
      price: 79.99,
      tags: ["mouse", "wireless", "workspace", "ergonomic"],
      description: "Re-engineer your productivity with this state of the art custom contoured wireless workhorse of a mouse. Features infinite smooth scrolling, custom macro triggers, premium silent clicks, and an adaptive layout suitable for long development turns.",
      keywords: "wireless mouse work, silent clicking optical mouse, smart office accessories, productivity gear ergonomic, precision scroll mouse",
      seoText: "Meta Title: Premium Contoured Silent Wireless Mouse\nMeta Description: Eradicate hand strain and boost your click speeds. This smart ergonomic mouse offers custom hotkeys, dynamic battery tracking, and hybrid multi-system sync ranges.",
      bossQuote: "Boss, wait, look! The click throughput of are team will triple with these mice. Let's sync them to Shopify and Amazon today!"
    });
  }
});

// Trends in-memory cache to prevent hitting rate limits
let cachedTrends: TrendItem[] | null = null;
let cachedTrendsTime: number = 0;
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes of caching

// AI: Scrapes trends and behaves like 'Boss, buy this'
app.get("/api/trends", async (req, res) => {
  const ai = getGeminiClient();

  // Robust fallback trend dataset
  const staticTrends: TrendItem[] = [
    {
      id: "trend-1",
      title: "Smart Water Bottle with LED Hydration Tracker",
      category: "Fitness & Tech",
      demandScore: 94,
      avgSellingPrice: 45.00,
      source: "TikTok Healthy Tech Trends",
      tags: ["smartbottle", "hydration", "health", "gadget"],
      bossQuote: "Boss, buy this tracker! Dehydration is at an all-time high and millennials are obsessed with fluorescent glowing caps. Total margin is 74% if we manufacture at $11 and publish to Shopify!",
      imageSearchTerm: "smart water bottle glowing led"
    },
    {
      id: "trend-2",
      title: "Portable Cordless Mini Humidifier with Nebula Projection",
      category: "Home & Wellness",
      demandScore: 89,
      avgSellingPrice: 29.99,
      source: "Amazon Movers & Shakers",
      tags: ["humidifier", "nebula", "bedroom", "aesthetic"],
      bossQuote: "Boss, buy this one! TikTok is losing its mind over bedroom ambiance. This projection humidifier costs peanuts ($6.20) in production and we can sell it for $29.99 everywhere. Instant wealth!",
      imageSearchTerm: "mini nebula humidifier projection"
    },
    {
      id: "trend-3",
      title: "Magnetic 3-in-1 Charging Stand with Night Ambient Light",
      category: "Mobile Accessories",
      demandScore: 92,
      avgSellingPrice: 59.99,
      source: "Shopify Tech Gadgets Hot List",
      tags: ["magsafe", "charger", "desksetup", "aesthetic"],
      bossQuote: "Boss, look at the charts! Minimalist workspace posts are getting millions of views. Hook this magnetic charger up. It sells like wildfire on TikTok Shop. Buy 500 units immediately!",
      imageSearchTerm: "magsafe stand desk light setup"
    }
  ];

  // Return cache if fresh
  if (cachedTrends && (Date.now() - cachedTrendsTime < CACHE_DURATION_MS)) {
    console.log("Serving fresh cached trends (time delta: %d ms)", Date.now() - cachedTrendsTime);
    return res.json(cachedTrends);
  }

  if (!ai) {
    return res.json(cachedTrends || staticTrends);
  }

  try {
    const prompt = `You are a brilliant e-commerce trend scanner butler. Scan recent dynamic online, social media, and market selling trends of high popularity.
    Formulate 3 hot-selling retail consumer electronic, smart gadget, or aesthetic lifestyle trends.
    For each trend, write a hilarious Butler-like enthusiastic growth-hacking pitch to me that starts with "Boss, buy this..." or "Boss, check this out..." explaining why it's a stellar cash cow. Ensure the quote is highly strategic but humorous, mentioning target stores like Shopify or TikTok Shop.

    Return a JSON array matching this typescript schema:
    Array<{
      id: string,
      title: string,
      category: string,
      demandScore: number, // 80-99
      avgSellingPrice: number, // realistic US Dollars price
      source: string, // e.g., "TikTok viral tech", "Amazon Movers" etc.
      tags: string[],
      bossQuote: string,
      imageSearchTerm: string
    }>`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              demandScore: { type: Type.INTEGER },
              avgSellingPrice: { type: Type.NUMBER },
              source: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              bossQuote: { type: Type.STRING, description: "Butler speaking like 'Boss, buy this...'" },
              imageSearchTerm: { type: Type.STRING, description: "Unsplash keyword to represent this item visually" }
            },
            required: ["id", "title", "category", "demandScore", "avgSellingPrice", "source", "tags", "bossQuote", "imageSearchTerm"]
          }
        }
      }
    });

    const trendsList = JSON.parse(response.text?.trim() || "[]");
    if (trendsList && trendsList.length > 0) {
      cachedTrends = trendsList;
      cachedTrendsTime = Date.now();
      return res.json(trendsList);
    }
    return res.json(cachedTrends || staticTrends);
  } catch (err: any) {
    console.error("Gemini scanning trends error, returning cached/static trends:", err);
    return res.json(cachedTrends || staticTrends);
  }
});

// App CRUD APIs for Products
app.get("/api/products", (req, res) => {
  res.json(products);
});

app.post("/api/products", (req, res) => {
  const { title, price, tags, image, description, keywords, seoText, publishToAll } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  const cleanPrice = parseFloat(price) || 29.99;
  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    title,
    price: cleanPrice,
    image: image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop&q=60",
    tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(",").map(t => t.trim()) : ["smart"]),
    description: description || "Automatically generated product details are currently processing.",
    keywords: keywords || "e-commerce product, smart gear",
    seoText: seoText || "Meta Title: Custom Product\nMeta Description: Purchase our newly listed top selling items now.",
    stores: {
      shopify: publishToAll || userStores.shopify.connected ? "published" : "draft",
      amazon: publishToAll || userStores.amazon.connected ? "published" : "draft",
      ebay: publishToAll || userStores.ebay.connected ? "published" : "draft",
      tiktok: publishToAll || userStores.tiktok.connected ? "published" : "draft"
    },
    createdAt: new Date().toISOString()
  };

  products.unshift(newProduct);

  // Increase the product counts dynamically in stats
  Object.keys(newProduct.stores).forEach((store) => {
    const key = store as keyof ConnectedStores;
    if (newProduct.stores[key] === "published") {
      userStores[key].productsCount += 1;
      userStores[key].sales += cleanPrice * Math.floor(Math.random() * 5 + 1);
    }
  });

  res.status(201).json(newProduct);
});

app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;
  products = products.filter(p => p.id !== id);
  res.json({ message: "Product successfully deleted", products });
});

// Endpoint to toggle store connection state and update stats
app.get("/api/stores", (req, res) => {
  res.json(userStores);
});

app.post("/api/stores/connect", (req, res) => {
  const { store, connected, apiKey, url } = req.body;
  const storeKey = store as keyof ConnectedStores;

  if (userStores[storeKey]) {
    userStores[storeKey] = {
      ...userStores[storeKey],
      connected: !!connected,
      apiKey: apiKey || "",
      url: url || "",
      // set some baseline if newly connecting
      sales: connected && userStores[storeKey].sales === 0 ? 520.00 : userStores[storeKey].sales,
      productsCount: connected && userStores[storeKey].productsCount === 0 ? 3 : userStores[storeKey].productsCount
    };
    return res.json({ message: `${storeKey} configuration updated!`, stores: userStores });
  }

  res.status(400).json({ error: "Invalid store identifier" });
});

// Endpoint representing the simulated store analytics data for the 3D Command Centre
app.get("/api/stores/stats", (req, res) => {
  res.json({
    summary: {
      totalSales: Object.values(userStores).reduce((sum, s) => sum + s.sales, 0),
      totalProducts: Object.values(userStores).reduce((sum, s) => sum + s.productsCount, 0),
      activeSyncCount: Object.values(userStores).filter(s => s.connected).length
    },
    stores: userStores,
    charts: {
      revenueByStore: Object.keys(userStores).map(key => ({
        name: key.toUpperCase(),
        value: userStores[key as keyof ConnectedStores].sales
      })),
      weeklySales: [
        { day: "Mon", shopify: 1200, amazon: 2300, ebay: 300, tiktok: 800 },
        { day: "Tue", shopify: 1500, amazon: 2100, ebay: 400, tiktok: 1100 },
        { day: "Wed", shopify: 1800, amazon: 2800, ebay: 200, tiktok: 900 },
        { day: "Thu", shopify: 1400, amazon: 3100, ebay: 500, tiktok: 1300 },
        { day: "Fri", shopify: 2100, amazon: 3900, ebay: 250, tiktok: 1600 },
        { day: "Sat", shopify: 2500, amazon: 4100, ebay: 600, tiktok: 2100 },
        { day: "Sun", shopify: 1945, amazon: 3410, ebay: 450, tiktok: 1720 }
      ]
    }
  });
});

// Sync triggers
app.post("/api/sync/:id", (req, res) => {
  const { id } = req.params;
  const { store } = req.body; // e.g. "shopify", "tiktok", "amazon", "ebay"

  const prod = products.find(p => p.id === id);
  if (!prod) {
    return res.status(404).json({ error: "Product not found" });
  }

  const sKey = store as "shopify" | "amazon" | "ebay" | "tiktok";
  if (!userStores[sKey as keyof ConnectedStores].connected) {
    return res.status(400).json({ error: `Cannot sync to ${sKey} because API is not connected. Configure in Connections.` });
  }

  // Set to pending then successful sync
  prod.stores[sKey] = "published";
  userStores[sKey as keyof ConnectedStores].productsCount += 1;
  userStores[sKey as keyof ConnectedStores].sales += prod.price;

  return res.json({
    status: "success",
    message: `Product successfully synced with ${sKey}'s API: Code 201 Created.`,
    product: prod
  });
});

// Endpoint to simulate real-time sales order generation for published products on active channels
app.post("/api/stores/simulate-sale", (req, res) => {
  const publishedProducts = products.filter(p => {
    return Object.values(p.stores).some(status => status === "published");
  });

  if (publishedProducts.length === 0) {
    return res.status(400).json({ error: "Deploy or compose catalog items with published status to trigger live automated sales!" });
  }

  const product = publishedProducts[Math.floor(Math.random() * publishedProducts.length)];

  // Get stores where this product is published and connected
  const activeChannels = Object.keys(product.stores).filter(storeKey => {
    const s = storeKey as keyof ConnectedStores;
    return product.stores[s] === "published" && userStores[s].connected;
  });

  if (activeChannels.length === 0) {
    return res.status(400).json({ error: "Connect at least one active channel (Shopify, Amazon, TikTok, or eBay) to link product routing webhook sales!" });
  }

  const selectedStore = activeChannels[Math.floor(Math.random() * activeChannels.length)] as keyof ConnectedStores;

  const buyerNames = [
    "Sarah Jenkins (New York)",
    "Kenji Sato (Tokyo)",
    "Emma Dupont (Paris)",
    "Mateo Silva (São Paulo)",
    "Elena Petrova (London)",
    "David Miller (San Francisco)",
    "Liam Wilson (Sydney)",
    "Amina Yusuf (Toronto)",
    "Sophia Patel (Chicago)",
    "Amara Okafor (Lagos)",
    "Charlotte Meier (Munich)"
  ];
  const buyer = buyerNames[Math.floor(Math.random() * buyerNames.length)];
  const amount = product.price;

  // Add revenue stream
  userStores[selectedStore].sales = parseFloat((userStores[selectedStore].sales + amount).toFixed(2));
  
  res.json({
    success: true,
    product: {
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image
    },
    buyer,
    store: selectedStore,
    amount
  });
});

// Setup dev server running
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.all("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Fully Functional Omnichannel Backend listening on Port : ${PORT}`);
  });
}

startServer();
