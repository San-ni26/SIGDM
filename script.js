const fs = require('fs');

const tabPath = '/Users/paulkone/Desktop/Next_projet/transport-ml/app/(admin)/dashboard/tabs/EntreprisesTab.tsx';
let tabContent = fs.readFileSync(tabPath, 'utf8');

// Global Replacements
tabContent = tabContent.replace(/Entreprise/g, 'Compagnie');
tabContent = tabContent.replace(/entreprise/g, 'compagnie');
// Fix the component name which became CompagnieTab instead of CompagniesTab (Wait, the original is EntreprisesTab, so replacing Entreprise->Compagnie makes it CompagniesTab. Correct.)

// Replace the icon import Building2 with Bus
tabContent = tabContent.replace(/Building2,/g, 'Bus,');

// Replace usages of Building2
tabContent = tabContent.replace(/<Building2 /g, '<Bus ');

// Add licenceTransport to the Interface
tabContent = tabContent.replace(/registreCommerce: string \| null;/g, "registreCommerce: string | null;\n  licenceTransport: string | null;");

// Update the Detail View to show LicenceTransport
const originalRow = `<InfoRow icon={<FileText className="w-3.5 h-3.5" />} label="Reg. Commerce" value={selectedCompagnie.registreCommerce || 'Non renseigné'} />`;
const newRow = `<InfoRow icon={<FileText className="w-3.5 h-3.5" />} label="Reg. Commerce" value={selectedCompagnie.registreCommerce || 'Non renseigné'} />\n                <InfoRow icon={<BadgeCheck className="w-3.5 h-3.5" />} label="Licence Trans." value={selectedCompagnie.licenceTransport || 'Non renseignée'} />`;
tabContent = tabContent.replace(originalRow, newRow);

fs.writeFileSync('/Users/paulkone/Desktop/Next_projet/transport-ml/app/(admin)/dashboard/tabs/CompagniesTab.tsx', tabContent);
console.log('Done!');
