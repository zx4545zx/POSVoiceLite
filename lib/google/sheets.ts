import { Order, Product, Settings } from "@/types/pos";

export interface GoogleDriveFile {
  id: string;
  name: string;
  webViewLink?: string;
}

/**
 * Searches user's Google Drive for existing 'POS Voice Lite' spreadsheet
 */
export async function findPOSSpreadsheet(accessToken: string): Promise<GoogleDriveFile | null> {
  const query = encodeURIComponent(
    "name = 'POS Voice Lite' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Google Drive API search failed:", res.status, errorText);
    throw new Error(`Drive search failed: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }

  return null;
}

/**
 * Creates a brand new 'POS Voice Lite' spreadsheet with Products, Orders, Settings sheets
 */
export async function createPOSSpreadsheet(accessToken: string): Promise<{ id: string; url: string }> {
  const url = "https://sheets.googleapis.com/v4/spreadsheets";

  const createRes = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: "POS Voice Lite",
      },
      sheets: [
        { properties: { title: "Products" } },
        { properties: { title: "Orders" } },
        { properties: { title: "Settings" } },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error("Failed to create spreadsheet:", createRes.status, err);
    throw new Error(`Failed to create spreadsheet: ${createRes.statusText}`);
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Initialize sheet headers
  const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const initHeadersRes = await fetch(batchUpdateUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: "Products!A1:F1",
          values: [["id", "name", "price", "active", "createdAt", "updatedAt"]],
        },
        {
          range: "Orders!A1:F1",
          values: [["orderId", "datetime", "items", "subtotal", "discount", "total"]],
        },
        {
          range: "Settings!A1:C2",
          values: [
            ["shopName", "voiceEnabled", "language"],
            ["ร้านของฉัน", "TRUE", "th-TH"],
          ],
        },
      ],
    }),
  });

  if (!initHeadersRes.ok) {
    console.warn("Failed to initialize sheet headers:", await initHeadersRes.text());
  }

  return { id: spreadsheetId, url: spreadsheetUrl };
}

/**
 * Ensures user has a POS spreadsheet ready, creating one if not found
 */
export async function ensurePOSSpreadsheet(accessToken: string): Promise<{ id: string; url: string }> {
  const existing = await findPOSSpreadsheet(accessToken);
  if (existing) {
    return {
      id: existing.id,
      url: existing.webViewLink || `https://docs.google.com/spreadsheets/d/${existing.id}/edit`,
    };
  }

  return await createPOSSpreadsheet(accessToken);
}

/**
 * Fetches all products from the Products sheet
 */
export async function fetchProductsFromSheet(accessToken: string, spreadsheetId: string): Promise<Product[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Products!A2:F`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    console.error("Failed to fetch products:", res.status, await res.text());
    return [];
  }

  const data = await res.json();
  const rows = data.values || [];

  return rows
    .map((row: string[]) => ({
      id: row[0] || "",
      name: row[1] || "",
      price: parseFloat(row[2]) || 0,
      active: row[3] !== "FALSE",
      createdAt: row[4] || "",
      updatedAt: row[5] || "",
    }))
    .filter((p: Product) => p.name && p.id);
}

/**
 * Fetches all orders from the Orders sheet
 */
export async function fetchOrdersFromSheet(accessToken: string, spreadsheetId: string): Promise<Order[] | null> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Orders!A2:F`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (!res.ok) {
    console.error("Failed to fetch orders:", res.status, await res.text());
    return null;
  }

  const rows: string[][] = (await res.json()).values || [];
  return rows
    .map((row) => ({
      orderId: row[0] || "",
      datetime: row[1] || "",
      items: row[2] || "",
      subtotal: parseFloat(row[3]) || 0,
      discount: parseFloat(row[4]) || 0,
      total: parseFloat(row[5]) || 0,
    }))
    .filter((o) => o.orderId);
}

/**
 * Appends a completed order to the Orders sheet
 */
export async function appendOrderToSheet(accessToken: string, spreadsheetId: string, order: Order): Promise<boolean> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Orders!A:F:append?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [
        [
          order.orderId,
          order.datetime,
          order.items,
          order.subtotal,
          order.discount,
          order.total,
        ],
      ],
    }),
  });

  if (!res.ok) {
    console.error("Failed to append order to sheet:", res.status, await res.text());
    return false;
  }

  return true;
}

/**
 * Saves or updates a product in the Products sheet
 */
export async function saveProductToSheet(
  accessToken: string,
  spreadsheetId: string,
  product: Product
): Promise<boolean> {
  // First, find if product already exists to get row index
  const listUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Products!A2:B`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (listRes.ok) {
    const listData = await listRes.json();
    const rows: string[][] = listData.values || [];
    const targetIndex = rows.findIndex(
      (r) => r[0] === product.id || r[1]?.toLowerCase() === product.name.toLowerCase()
    );

    if (targetIndex >= 0) {
      // Row 2 is index 0 -> row number is targetIndex + 2
      const rowNum = targetIndex + 2;
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Products!A${rowNum}:F${rowNum}?valueInputOption=RAW`;
      const updateRes = await fetch(updateUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [
            [
              product.id,
              product.name,
              product.price,
              product.active ? "TRUE" : "FALSE",
              product.createdAt || new Date().toISOString(),
              new Date().toISOString(),
            ],
          ],
        }),
      });

      return updateRes.ok;
    }
  }

  // Not found: append new row
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Products!A:F:append?valueInputOption=RAW`;
  const appendRes = await fetch(appendUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [
        [
          product.id,
          product.name,
          product.price,
          product.active ? "TRUE" : "FALSE",
          product.createdAt || new Date().toISOString(),
          product.updatedAt || new Date().toISOString(),
        ],
      ],
    }),
  });

  return appendRes.ok;
}

/**
 * Reads settings from the Settings sheet
 */
export async function fetchSettingsFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<Settings> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Settings!A2:C2`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const defaultSettings: Settings = {
    shopName: "ร้านของฉัน",
    voiceEnabled: true,
    language: "th-TH",
    spreadsheetId,
  };

  if (!res.ok) {
    return defaultSettings;
  }

  const data = await res.json();
  const row = data.values?.[0];
  if (!row) return defaultSettings;

  return {
    shopName: row[0] || "ร้านของฉัน",
    voiceEnabled: row[1] !== "FALSE",
    language: row[2] || "th-TH",
    spreadsheetId,
  };
}

/**
 * Updates settings in the Settings sheet
 */
export async function saveSettingsToSheet(
  accessToken: string,
  spreadsheetId: string,
  settings: Partial<Settings>
): Promise<boolean> {
  const current = await fetchSettingsFromSheet(accessToken, spreadsheetId);
  const updated: Settings = { ...current, ...settings };

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Settings!A2:C2?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [[updated.shopName, updated.voiceEnabled ? "TRUE" : "FALSE", updated.language]],
    }),
  });

  return res.ok;
}
