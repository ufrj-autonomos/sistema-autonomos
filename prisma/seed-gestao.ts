import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Semeando dados operacionais do Subsistema de Gestão...");

  // 1. Equipes / Divisões
  const harpia = await prisma.team.upsert({
    where: { slug: "harpia" },
    update: {
      name: "UFRJ Harpia",
      founded: 2026,
      tags: "uav,drone,px4,ros2,aeronaves,computacao-embarcada",
    },
    create: {
      slug: "harpia",
      name: "UFRJ Harpia",
      founded: 2026,
      tags: "uav,drone,px4,ros2,aeronaves,computacao-embarcada",
    },
  });

  const nautilus = await prisma.team.upsert({
    where: { slug: "nautilus" },
    update: {
      name: "UFRJ Nautilus",
      founded: 2016,
      tags: "auv,submarino,sonar,acustica,ros2,robosub,propulsao-vetorial",
    },
    create: {
      slug: "nautilus",
      name: "UFRJ Nautilus",
      founded: 2016,
      tags: "auv,submarino,sonar,acustica,ros2,robosub,propulsao-vetorial",
    },
  });

  console.log(`✅ Equipes configuradas: Harpia [${harpia.id}], Nautilus [${nautilus.id}]`);

  // 2. Projetos de Robótica
  const projectsData = [
    {
      teamId: harpia.id,
      slug: "hexacopter-h01",
      name: "Drone Hexacóptero H-01",
      tagline: "Veículo multirotor de alta estabilidade para missões autônomas.",
      description:
        "Plataforma multirotor equipada com NVIDIA Jetson Orin Nano, PX4 Pixhawk 6C e sensores LiDAR 2D. Executa algoritmos de visão embarcada com YOLOv8 e navegação autônoma em ROS 2 Jazzy para missões de busca e resgate.",
      status: "Operacional / Em voo de teste",
      year: 2026,
      tags: "ROS 2 Jazzy, PX4, Jetson Orin, LiDAR, YOLOv8",
    },
    {
      teamId: harpia.id,
      slug: "vant-asa-fixa-alpha",
      name: "VANT Asa Fixa Alpha",
      tagline: "Aeronave de longo alcance para mapeamento de grandes áreas.",
      description:
        "Aeronave não tripulada com propulsão elétrica projetada para a competição SAE Brasil AeroDesign. Foco em alta eficiência aerodinâmica, telemetria de longo alcance e planejamento de trajetórias com Nav2.",
      status: "P&D / Simulação",
      year: 2026,
      tags: "SAE AeroDesign, PX4, RFD900x, Aerodinâmica, Telemetria",
    },
    {
      teamId: nautilus.id,
      slug: "brhue-auv",
      name: "Br-HUE AUV",
      tagline: "Submarino autônomo de competição para a RoboSub (EUA).",
      description:
        "Veículo subaquático autônomo com 8 propulsores Blue Robotics T200, propulsão vetorial com 5 graus de liberdade, casco estanque em acrílico usinado e fusão sensorial com sonar acústico Ping360 e DVL.",
      status: "Em testes de tanque",
      year: 2025,
      tags: "RoboSub, 5 DoF, Sonar Acústico, DVL, ROS 2 Jazzy",
    },
    {
      teamId: nautilus.id,
      slug: "vovozao-auv",
      name: "Vovozão AUV",
      tagline: "Plataforma experimental robusta para testes de hidrodinâmica e controle.",
      description:
        "Primeiro AUV desenvolvido pela Nautilus na UFRJ, utilizado como bancada de testes para validação de algoritmos de controle ótimo LQR, estimadores de estado EKF e baterias submarinas LiPo com telemetria BMS.",
      status: "Operacional / Bancada",
      year: 2023,
      tags: "Bancada Experimental, EKF, Acústica, Hidrodinâmica",
    },
  ];

  for (const p of projectsData) {
    const existing = await prisma.project.findFirst({
      where: { teamId: p.teamId, slug: p.slug },
    });
    if (!existing) {
      await prisma.project.create({ data: p });
    } else {
      await prisma.project.update({ where: { id: existing.id }, data: p });
    }
  }
  console.log("✅ Projetos de robótica sincronizados.");

  // 3. Integrantes Técnicos e Administrativos
  const membersData = [
    {
      name: "Lucas Silva",
      role: "Capitão Geral",
      area: "Gestão",
      bio: "Coordenação geral do laboratório, relacionamento institucional com a Poli-UFRJ e captação de recursos.",
      course: "Engenharia de Controle e Automação",
      teamId: null,
      active: true,
      linkedin: "https://linkedin.com",
      github: "https://github.com",
    },
    {
      name: "Sofia Oliveira",
      role: "Líder Técnica Harpia",
      area: "Software",
      bio: "Arquiteta de sistemas em ROS 2 Jazzy, controle de voo em PX4 e integração de visão computacional com Jetson Orin.",
      course: "Ciência da Computação",
      teamId: harpia.id,
      active: true,
      linkedin: "https://linkedin.com",
      github: "https://github.com",
    },
    {
      name: "Gabriel Santos",
      role: "Líder Técnico Nautilus",
      area: "Software",
      bio: "Especialista em navegação inercial (INS), fusão de sensores submarinos (DVL + IMU) e algoritmos SLAM acústicos.",
      course: "Engenharia Eletrônica e de Computação",
      teamId: nautilus.id,
      active: true,
      linkedin: "https://linkedin.com",
      github: "https://github.com",
    },
    {
      name: "Mariana Costa",
      role: "Pesquisadora Sênior",
      area: "Software",
      bio: "Desenvolvimento de nós ROS 2 para detecção de obstáculos e alvos aéreos com redes neurais YOLOv8.",
      course: "Engenharia de Controle e Automação",
      teamId: harpia.id,
      active: true,
      linkedin: "https://linkedin.com",
      github: "https://github.com",
    },
    {
      name: "Rodrigo Lima",
      role: "Pesquisador",
      area: "Mecânica",
      bio: "Projeto mecânico de cascos estanques em alumínio 6061-T6, análise CFD de hidrodinâmica e esteiras de suporte.",
      course: "Engenharia Mecânica / Naval",
      teamId: nautilus.id,
      active: true,
      linkedin: "https://linkedin.com",
      github: "https://github.com",
    },
    {
      name: "Beatriz Almeida",
      role: "Engenheira Eletrônica",
      area: "Eletrônica",
      bio: "Desenvolvimento de PCBs customizadas para distribuição de potência, drivers de motores e telemetria CAN bus.",
      course: "Engenharia Eletrônica",
      teamId: harpia.id,
      active: true,
      linkedin: "https://linkedin.com",
      github: "https://github.com",
    },
    {
      name: "Carlos Eduardo",
      role: "Aluno Pesquisador",
      area: "Software",
      bio: "Implementação de nós de controle vetorial e missões autônomas com árvores de comportamento (BehaviorTree.CPP).",
      course: "Engenharia de Controle e Automação",
      teamId: nautilus.id,
      active: true,
      linkedin: "https://linkedin.com",
      github: "https://github.com",
    },
    {
      name: "Juliana Mendes",
      role: "Diretora de Operações",
      area: "Gestão",
      bio: "Planejamento de sprints, gestão de compras de componentes importados e logística de competições nacionais e internacionais.",
      course: "Engenharia de Produção",
      teamId: null,
      active: true,
      linkedin: "https://linkedin.com",
      github: "https://github.com",
    },
  ];

  for (const m of membersData) {
    const existing = await prisma.member.findFirst({
      where: { name: m.name },
    });
    if (!existing) {
      await prisma.member.create({ data: m });
    } else {
      await prisma.member.update({ where: { id: existing.id }, data: m });
    }
  }

  console.log(`✅ ${membersData.length} integrantes operacionais semeados no banco Supabase.`);
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed de Gestão:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
