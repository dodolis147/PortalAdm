import { residentsRepository } from './src/services/residentService';

async function checkResidents() {
  const residents = await residentsRepository.findAll();
  console.log('Residents found:', residents.length);
  residents.forEach(r => {
    console.log(`Resident: ${r.name}, qrCodeValue: ${r.qrCodeValue}`);
  });
}

checkResidents();
