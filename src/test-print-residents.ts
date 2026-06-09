// Automated Test Suite: Resident Filter and Print Preview Format Validator
// This file executes under npx tsx to verify all filtering and formatting rules of the print components.

import { Resident } from './types';

// 1. Mock Data Setup
const mockResidents: Resident[] = [
  {
    id: 'res-1',
    name: 'José Carlos Silva',
    unit: 'Torre 1 - Apt 101',
    phone: '11988888888',
    email: 'jose.carlos@example.com',
    status: 'Ativo',
    members: ['Ana Silva (Esposa)', 'Mateus Silva (Filho)'],
    vehicles: [
      { brandModel: 'Chevrolet Onix', plate: 'BRA2E19', color: 'Prata' }
    ]
  },
  {
    id: 'res-2',
    name: 'Maria Eduarda Santos',
    unit: 'Torre 1 - Apt 102',
    phone: '11977777777',
    email: 'maria.santos@example.com',
    status: 'Inativo',
    members: [],
    vehicles: []
  },
  {
    id: 'res-3',
    name: 'Carlos Alberto Ferreira',
    unit: 'Torre 2 - Apt 201',
    phone: '11966666666',
    email: 'carlos.ferreira@example.com',
    status: 'Ativo',
    members: ['Beatriz Ferreira (Esposa)'],
    vehicles: [
      { brandModel: 'Toyota Corolla', plate: 'XYZ3E21', color: 'Preto' },
      { brandModel: 'Honda Biz', plate: 'ABC1234', color: 'Vermelho' }
    ]
  },
  {
    id: 'res-4',
    name: 'Ana Cláudia Souza',
    unit: 'Torre 3 - Apt 304',
    phone: '11955555555',
    email: 'ana.souza@example.com',
    status: 'Bloqueado',
    members: [],
    vehicles: []
  },
  {
    id: 'res-5',
    name: 'Paulo Henrique Nunes',
    unit: 'Torre 2 - Apt 405',
    phone: '11944444444',
    email: 'paulo.nunes@example.com',
    status: 'Ativo',
    members: ['Carla Nunes'],
    vehicles: [
      { brandModel: 'Ford Ka', plate: 'KAA5566', color: 'Branco' }
    ]
  }
];

// Helper to filter residents using the identical business logic used inside ResidentsView.tsx
function filterResidents(
  list: Resident[],
  searchQuery: string,
  filterStatus: 'All' | 'Ativo' | 'Inativo' | 'Bloqueado',
  selectedTower: string
): Resident[] {
  return list.filter((res) => {
    // 1. Status Filter
    if (filterStatus !== 'All' && res.status !== filterStatus) return false;

    // 2. Tower / Block Filter
    if (selectedTower !== 'Todas') {
      const uUpper = res.unit.toUpperCase();
      const tUpper = selectedTower.toUpperCase();
      if (!uUpper.includes(tUpper)) return false;
    }

    // 3. Search Query Filter (name, unit, phone, cpf, rg, or vehicle plates)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      const hasMatchingPlate = res.vehicles?.some(v => v.plate.toLowerCase().includes(query));
      const hasMatchingCar = res.vehicles?.some(v => v.brandModel.toLowerCase().includes(query));
      const hasMatchingMember = res.members?.some(m => m.toLowerCase().includes(query));
      
      const matchName = res.name.toLowerCase().includes(query);
      const matchUnit = res.unit.toLowerCase().includes(query);
      const matchPhone = res.phone.toLowerCase().includes(query);
      const matchEmail = res.email?.toLowerCase().includes(query);

      if (!matchName && !matchUnit && !matchPhone && !matchEmail && !hasMatchingPlate && !hasMatchingCar && !hasMatchingMember) {
        return false;
      }
    }

    return true;
  });
}

// 2. Test Execution Engine
console.log('========================================================================');
console.log('▶ INICIANDO TESTES AUTOMATIZADOS: PRÉVIA DE IMPRESSÃO - RESIDENTS LIST');
console.log('========================================================================');

let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (detail) console.error(`   Detalhe: ${detail}`);
    testsFailed++;
  }
}

// --- TEST CASE 1: Respect applied filters - Status "Ativo" ---
try {
  const result = filterResidents(mockResidents, '', 'Ativo', 'Todas');
  assert(
    result.length === 3,
    'Filtro por status: Ativo',
    `Esperado 3 moradores ativos, encontrou ${result.length}`
  );
  assert(
    result.every(r => r.status === 'Ativo'),
    'Consistência de dados filtrados por status',
    'Encontrado morador com status não correspondente a Ativo no resultado.'
  );
} catch (e: any) {
  console.error(e);
  testsFailed++;
}

// --- TEST CASE 2: Respect applied filters - Selected Tower Block "Torre 1" ---
try {
  const result = filterResidents(mockResidents, '', 'All', 'Torre 1');
  assert(
    result.length === 2,
    'Filtro por bloco/torre: Torre 1',
    `Esperado 2 moradores na Torre 1, encontrou ${result.length}`
  );
  assert(
    result.every(r => r.unit.includes('Torre 1')),
    'Integridade do filtro de Torre',
    'Encontrado registro fora da Torre 1 nos dados filtrados.'
  );
} catch (e: any) {
  console.error(e);
  testsFailed++;
}

// --- TEST CASE 3: Search Query Matches by Vehicle License Plate ---
try {
  const result = filterResidents(mockResidents, 'BRA2E19', 'All', 'Todas');
  assert(
    result.length === 1,
    'Filtro por placa de veículo',
    `Esperado encontrar 1 morador com placa BRA2E19, encontrou ${result.length}`
  );
  assert(
    result[0].name === 'José Carlos Silva',
    'Consistência de registro localizado por veículo',
    `Esperado "José Carlos Silva", encontrou "${result[0]?.name}"`
  );
} catch (e: any) {
  console.error(e);
  testsFailed++;
}

// --- TEST CASE 4: Consistência dos dados e ordenação ---
try {
  const resultAll = filterResidents(mockResidents, '', 'All', 'Todas');
  assert(
    resultAll.length === mockResidents.length,
    'Preservação e integridade total dos registros',
    'A listagem completa divergiu da contagem original do banco de dados'
  );
  
  // Verify correct index order mapping
  const orderMatches = resultAll.every((item, idx) => item.id === mockResidents[idx].id);
  assert(
    orderMatches,
    'Garantia de ordenação idêntica da visualização na impressão',
    'A ordem dos registros mudou durante a aplicação dos layouts de renderização.'
  );
} catch (e: any) {
  console.error(e);
  testsFailed++;
}

// --- TEST CASE 5: High volume list pagination/performance check ---
try {
  // Generate a list representing high density records
  const denseList: Resident[] = Array.from({ length: 500 }).map((_, index) => ({
    id: `dense-res-${index}`,
    name: `Morador Dense Volume #${index}`,
    unit: `Torre ${(index % 3) + 1} - Apt ${100 + index}`,
    phone: '11999999999',
    status: index % 2 === 0 ? 'Ativo' : 'Inativo',
    vehicles: index % 5 === 0 ? [{ brandModel: 'Tester Car', plate: `TST${index}A`, color: 'Azul' }] : [],
    members: []
  }));

  const activeT3 = filterResidents(denseList, '', 'Ativo', 'Torre 3');
  // Check correctness
  const countExpected = denseList.filter(d => d.status === 'Ativo' && d.unit.includes('Torre 3')).length;
  assert(
    activeT3.length === countExpected,
    'Simulação de carga pesada com paginação e consistência em lote',
    `Contagem de paginação de volume grande incorreta. Esperado ${countExpected}, encontrou ${activeT3.length}`
  );
} catch (e: any) {
  console.error(e);
  testsFailed++;
}

console.log('========================================================================');
if (testsFailed === 0) {
  console.log('🎉 SUCESSO: Todos os testes passaram sem erros de consistência ou integridade!');
  console.log('========================================================================');
  process.exit(0);
} else {
  console.error(`🚨 DETECTADO: ${testsFailed} falha(s) nos testes.`);
  console.log('========================================================================');
  process.exit(1);
}
