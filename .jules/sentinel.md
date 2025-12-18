## 2024-05-23 - CSV Injection in Client-Side Export
**Vulnerability:** Client-side CSV generation in `LiveShopAssistant.tsx` was vulnerable to CSV/Formula Injection. User input starting with `=`, `+`, `-`, or `@` was written directly to the CSV, which could execute arbitrary code when opened in Excel/Sheets. Additionally, the CSV structure was broken due to incorrect array spreading.
**Learning:** Even client-side exports need strict sanitization. Simply wrapping values in quotes is insufficient for security (formulas) and correctness (internal quotes).
**Prevention:** Always use a CSV library or a robust helper function that handles both escaping quotes (`"` -> `""`) and neutralizing formulas (prepending `'`) for all user-generated content in CSV exports.
