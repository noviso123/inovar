
import { ServiceRequest, Equipment, TimelineEvent, Company } from '../types';

const SERVICE_INTELLIGENCE: Record<string, { price: number, terms: string, norm: string, detail: string }> = {
  'LIMPEZA': {
    price: 280,
    terms: 'Higienização química bactericida PMOC.',
    norm: 'Lei 13.589/2018 | ANVISA RE 09',
    detail: 'Sanitização completa de serpentina, filtros e dreno com biocida homologado.'
  },
  'VAZAMENTO': {
    price: 450,
    terms: 'Reparo de vazamento e brasagem.',
    norm: 'ABNT NBR 15960',
    detail: 'Teste de estanqueidade com nitrogênio e vácuo técnico abaixo de 500 microns.'
  },
  'INSTALACAO': {
    price: 900,
    terms: 'Instalação técnica padrão inverter.',
    norm: 'ABNT NBR 16655',
    detail: 'Fixação, infraestrutura em cobre e startup com medição de superaquecimento.'
  }
};

export const generateTechnicalReport = (request: ServiceRequest, equipments: Equipment[], logs: TimelineEvent[], company?: Partial<Company>) => {
  if (!request || !request.id) return false;

  const desc = (request.description || "").toUpperCase();

  const key = Object.keys(SERVICE_INTELLIGENCE).find(k => desc.includes(k)) || 'PADRÃO';
  const intel = SERVICE_INTELLIGENCE[key] || {
    price: 350,
    terms: 'Manutenção Técnica Especializada',
    norm: 'Normas ABNT Vigentes',
    detail: 'Intervenção técnica conforme diagnóstico técnico de campo.'
  };

  const assets = equipments.map(e => ({
    marca_modelo: `${e.brand} ${e.model}`,
    capacidade: `${e.btu} BTU`,
    local: e.location,
    serial: e.serialNumber || 'N/A',
    valor_servico: intel.price
  }));

  const subtotal = assets.reduce((acc, curr) => acc + curr.valor_servico, 0);
  const desconto = equipments.length > 1 ? subtotal * 0.15 : 0;
  const total = subtotal - desconto;

  const pixKey = company?.bankDetails || "financeiro@inovar.tech";
  // Payload PIX Estático (Padrão BRCode)
  const pixPayload = `00020126330014BR.GOV.BCB.PIX0114${pixKey.replace(/\D/g, '')}5204000053039865405${total.toFixed(2)}5802BR5915INOVAR_AIR_LTDA6009SAO_PAULO62070503***6304`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixPayload)}&margin=1`;

  const report = {
    doc_id: `INV-${request.id.split('-')[1]?.toUpperCase() || 'REF'}`,
    emissao: new Date().toLocaleDateString('pt-BR'),
    validade: "7 dias",
    emissor: {
      razao: company?.razaoSocial || "INOVAR TECNOLOGIA",
      cnpj: company?.cnpj || "00.000.000/0001-00",
      pix_recebimento: pixKey
    },
    financeiro: {
      total_liquido: total,
      metodo: "PIX",
      qrcode_url: qrCodeUrl
    },
    escopo: intel.terms,
    itens: assets
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = `ORCAMENTO_${report.doc_id}.json`;
  link.click();

  alert(`Orçamento gerado! Pagamento PIX disponível via QR Code no documento.`);
  return true;
};
