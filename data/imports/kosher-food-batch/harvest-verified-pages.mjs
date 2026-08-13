/**
 * Wave 10 — rows read off official directory pages that refuse scripted fetches.
 *
 * Each entry below was read from the cited page during this pass: a venue name
 * sitting beside a street address. Rows with no street address on the page
 * (caterers, pop-ups, "order online" listings, synagogue function halls) were
 * left out. NEEDS_REVIEW only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");

const pages = [
  {
    sourceKey: "vaad-greater-washington",
    agency: "the Rabbinical Council of Greater Washington",
    listingUrl: "https://www.capitolk.org/restaurants/",
    country: "United States",
    venues: [
      ["Al Haesh", "4860 Boiling Brook Parkway, Rockville, MD 20852", "Rockville", "Restaurant"],
      ["Ben Yehuda Cafe and Pizzeria", "1370B Lamberton Drive, Silver Spring, MD 20902", "Silver Spring", "Cafe"],
      ["Cafe Sunflower", "6101 Executive Boulevard, Suite 115, Rockville, MD 20852", "Rockville", "Bakery"],
      ["Char Bar", "2142 L St NW, Washington, DC 20037", "Washington", "Restaurant"],
      ["Cafe K", "1300 Spring St #136, Silver Spring, MD 20910", "Silver Spring", "Cafe"],
      ["Goldberg's New York Bagels", "4824-6 Boiling Brook Parkway, Rockville, MD 20852", "Rockville", "Bakery"],
      ["Goldberg's New York Bagels II", "9328 Georgia Ave, Silver Spring, MD 20910", "Silver Spring", "Bakery"],
      ["Holy Chow", "1331 Lamberton Drive, Silver Spring, MD 20902", "Silver Spring", "Takeaway"],
      ["Kosher Pastry Oven Cafe", "1372 Lamberton Drive, Wheaton, MD 20902", "Wheaton", "Cafe"],
      ["Nut House Pizza", "11419 Georgia Avenue, Wheaton, MD 20902", "Wheaton", "Restaurant"],
      ["Oh Mama Grill Rockville", "188 Rollins Ave, Rockville, MD 20852", "Rockville", "Restaurant"],
      ["Oh Mama Grill Washington DC", "1829 Columbia Rd NW, Washington, DC 20009", "Washington", "Restaurant"],
      ["Oro Nami", "2512 Pennsylvania Ave NW, Washington, DC 20037", "Washington", "Restaurant"],
      ["Siena's Pizzeria", "4840 Boiling Brook Parkway, Rockville, MD 20852", "Rockville", "Restaurant"],
      ["Sticky Fingers Cafe", "314 Carroll Street NW, Washington, DC 20012", "Washington", "Cafe"],
      ["University of Maryland Hillel", "7612 Mowatt Lane, College Park, MD 20740", "College Park", "Restaurant"],
    ],
  },
  {
    sourceKey: "vaad-memphis",
    agency: "the Vaad Hakehilloth of Memphis",
    listingUrl: "https://www.vaadofmemphis.org/kosher.html",
    country: "United States",
    venues: [
      ["Nosh-A-Rye Deli", "36 Bazeberry Road, Memphis, TN", "Memphis", "Restaurant"],
      ["Kroger Mendenhall", "540 S. Mendenhall Road, Memphis, TN", "Memphis", "Grocery"],
      ["Kroger Poplar", "6660 Poplar Avenue, Memphis, TN", "Memphis", "Grocery"],
      ["Dinstuhl's Pleasant View", "5280 Pleasant View Road, Memphis, TN", "Memphis", "Grocery"],
      ["Dinstuhl's Grove Park", "436 S. Grove Park Road, Memphis, TN", "Memphis", "Grocery"],
      ["Dinstuhl's Poplar", "7730 Poplar Avenue, Memphis, TN", "Memphis", "Grocery"],
      ["Nothing Bundt Cakes", "681 S. White Station Road, Memphis, TN", "Memphis", "Bakery"],
      ["Ricki's Cookie Corner", "5068 Park Avenue, Memphis, TN", "Memphis", "Bakery"],
    ],
  },
  {
    sourceKey: "jscn-kosher-food",
    agency: "the Jewish Small Communities Network",
    listingUrl: "https://jscn.org.uk/kosher-food/",
    country: "United Kingdom",
    venues: [
      ["GK Butchers", "187-189 Coatsworth Road, Gateshead NE8 1SR", "Gateshead", "Butcher"],
      ["Stenhouse Bakery & Delicatessen", "211-215 Coatsworth Road, Gateshead NE8 1SR", "Gateshead", "Bakery"],
      ["Cakes by Penina", "Carlisle House, 2-4 Cambridge Terrace, Gateshead NE8 1RP", "Gateshead", "Bakery"],
      ["Fishponds Fishmongers", "108 Coatsworth Road, Gateshead NE8 1QP", "Gateshead", "Grocery"],
      ["Blooms", "221 Coatsworth Road, Gateshead NE8 1SR", "Gateshead", "Grocery"],
      ["The Kosher Deli @ Central", "4 Speedwell Road, Edgbaston, Birmingham B5 7PR", "Birmingham", "Grocery"],
      ["Mark's Deli", "6 Burnfield Road, Giffnock, Glasgow G46 7QB", "Glasgow", "Grocery"],
      ["Sora's Cafe & L'Chaim's Restaurant", "222 Fenwick Road, Giffnock, Glasgow G46 6UE", "Glasgow", "Restaurant"],
      ["Falko Konditormeister Bakery", "185 Bruntsfield Place, Bruntsfield, Edinburgh EH10 4DG", "Edinburgh", "Bakery"],
      ["Arons Jewish Delicatessen", "19 Chandos Road, Bristol BS6 6PG", "Bristol", "Grocery"],
    ],
  },
  {
    sourceKey: "leeds-beth-din",
    agency: "the Leeds Beth Din and Kashrut Authority",
    listingUrl: "https://www.leedsbethdin.co.uk/our-licensees",
    country: "United Kingdom",
    venues: [["Marlows British Kitchen Fish and Chips", "391 Street Lane, Leeds LS17 6HQ", "Leeds", "Restaurant"]],
  },
];

const harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
const have = new Set(
  harvested.map((r) => `${r.name.toLowerCase()}::${(r.address || "").toLowerCase()}::${String(r.locality).toLowerCase()}`),
);
const newRows = [];

for (const page of pages) {
  for (const [name, address, locality, category] of page.venues) {
    const key = `${name.toLowerCase()}::${address.toLowerCase()}::${locality.toLowerCase()}`;
    if (have.has(key)) continue;
    have.add(key);
    newRows.push({
      sourceKey: page.sourceKey,
      name,
      address,
      locality,
      destination: locality,
      country: page.country,
      category,
      listingUrl: page.listingUrl,
      website: null,
      type: category,
      summary: `${name} is listed as a kosher ${category.toLowerCase()} by ${page.agency}. Confirm current supervision on the cited page before relying on it.`,
    });
  }
}

if (!process.env.DRY_RUN) fs.writeFileSync(OUT, JSON.stringify([...harvested, ...newRows], null, 2));
console.log(JSON.stringify({ added: newRows.length, total: harvested.length + newRows.length }, null, 2));
