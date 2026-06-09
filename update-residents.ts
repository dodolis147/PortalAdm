import { residentsRepository } from './src/services/residentService';
import { generateAccessCode } from './src/lib/utils';
// Note: Resident type needs to be imported if we wanted typed access, for this script it's OK untyped.

async function updateResidents() {
    console.log('--- Updating residents access codes to 4 digits ---');
    const all = await residentsRepository.findAll();
    console.log(`Found ${all.length} residents.`);
    
    for (const r of all) {
        const newCode = generateAccessCode(4).toUpperCase();
        console.log(`Updating ${r.name}: [${r.qrCodeValue}] -> [${newCode}]`);
        
        // Ensure we create a new object without potential extra fields, just upsert
        const updatedResident = { ...r, qrCodeValue: newCode };
        await residentsRepository.upsert(updatedResident);
    }
    console.log('--- Update complete. ---');
}

updateResidents().catch(console.error);
