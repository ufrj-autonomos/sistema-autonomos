import { PrismaClient, Role, LessonType, VideoStatus, ExerciseType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const translatedLessonsPath = path.join(__dirname, 'translated-lessons.json');
let translatedLessons: Record<string, { title: string; summary: string; content: string }> = {};
if (fs.existsSync(translatedLessonsPath)) {
  try {
    translatedLessons = JSON.parse(fs.readFileSync(translatedLessonsPath, 'utf-8'));
  } catch (err) {
    console.warn('Não foi possível carregar translated-lessons.json:', err);
  }
}

// ============================================================================
// DADOS DOS 11 MÓDULOS E 108 AULAS DO CURSO ROS 2 JAZZY
// ============================================================================

interface LessonSeedItem {
  orderIndex: number;
  title: string;
  slug: string;
  type: 'video' | 'text';
  videoStatus: 'available' | 'pending';
  youtubeVideoId: string | null;
  durationSeconds: number;
  rosDocsUrl?: string;
  content: string;
}

interface ModuleSeedItem {
  orderIndex: number;
  title: string;
  description: string;
  lessons: LessonSeedItem[];
}

const MODULES_DATA: ModuleSeedItem[] = [
  {
    orderIndex: 1,
    title: '1. Introduction',
    description: 'Apresentação do curso, fundamentos do ecossistema ROS 2 e conceitos essenciais de robótica autônoma.',
    lessons: [
      {
        orderIndex: 1,
        title: 'Welcome',
        slug: '001-welcome',
        type: 'video',
        videoStatus: 'available',
        youtubeVideoId: '6eLTFFXoqyw',
        durationSeconds: 169,
        rosDocsUrl: 'https://docs.ros.org/en/jazzy/index.html',
        content: `### Boas-vindas ao Curso ROS 2 Jazzy Jalisco
Bem-vindo ao curso prático de **ROS 2 Jazzy Jalisco**, ministrado pela **UFRJ Autônomos**.
Neste curso você aprenderá a construir nós inteligentes, configurar pipelines de comunicação distribuída e simular robôs autônomos.

---

### 🎙️ Dica: Legendas e Áudio Dublado no YouTube

Todos os vídeos da plataforma já são configurados para **abrir automaticamente com legendas em português (\`pt-BR\`)**.

Caso queira ajustar a legenda automática ou alternar para a faixa dublada no YouTube:

1. **Legendas em Português / Tradução Automática:**
   - No player do YouTube, clique no ícone **CC** (Legendas) no canto inferior direito para ligar/desligar.
   - Para traduzir caso esteja em outro idioma: clique na **Engrenagem (⚙️ Detalhes)** > **Legendas** > **Traduzir automaticamente** > Selecione **Português**.

2. **Faixa de Áudio Dublada (quando disponível no YouTube):**
   - Clique na **Engrenagem (⚙️ Detalhes)** no canto inferior do player.
   - Selecione **Faixa de áudio**.
   - Escolha **Português (dublado)**.`,
      },
      {
        orderIndex: 2,
        title: 'What is ROS2 When to use it and Why',
        slug: '002-what-is-ros2-when-to-use-it-and-why',
        type: 'video',
        videoStatus: 'available',
        youtubeVideoId: 'Z2RbaRK_R5E',
        durationSeconds: 321,
        rosDocsUrl: 'https://docs.ros.org/en/jazzy/Concepts/Basic/About-ROS-2-Concepts.html',
        content: `### O que é o ROS 2 e por que utilizá-lo?
O Robot Operating System (ROS 2) é um middleware de código aberto construído sobre o padrão DDS (Data Distribution Service).
- **Sem Ponto Único de Falha**: Não existe mais o \`roscore\` centralizado.
- **Sistemas de Tempo Real**: Suporte para microcontroladores e arquiteturas de missão crítica.
- **Multi-plataforma**: Execução nativa no Ubuntu 24.04 LTS (Noble Numbat).`,
      },
      {
        orderIndex: 3,
        title: 'How to get the most out of this course',
        slug: '003-how-to-get-the-most-out-of-this-course',
        type: 'text',
        videoStatus: 'pending',
        youtubeVideoId: null,
        durationSeconds: 180,
        content: `### Como aproveitar ao máximo este treinamento
1. Digite todos os comandos e códigos manualmente no terminal.
2. Resolva todas as atividades práticas antes de consultar a solução.
3. Utilize os atalhos de terminal (\`terminator\` / \`tmux\`) para monitorar tópicos e nós simultaneamente.`,
      },
    ],
  },
  {
    orderIndex: 2,
    title: '2. Install ROS2 and Setup Your Environment',
    description: 'Instalação do ROS 2 Jazzy no Ubuntu 24.04 LTS, configuração de variáveis de ambiente e ferramentas de produtividade.',
    lessons: [
      {
        orderIndex: 4,
        title: 'Intro',
        slug: '004-intro-install',
        type: 'text',
        videoStatus: 'pending',
        youtubeVideoId: null,
        durationSeconds: 120,
        content: `Visão geral do processo de instalação e preparação do sistema operacional Ubuntu 24.04 LTS.`,
      },
      {
        orderIndex: 5,
        title: 'Which ROS 2 Distribution to Use',
        slug: '005-which-ros-2-distribution-to-use',
        type: 'video',
        videoStatus: 'available',
        youtubeVideoId: '0ncJopGXZvo',
        durationSeconds: 269,
        rosDocsUrl: 'https://docs.ros.org/en/jazzy/Releases.html',
        content: `### Distribuições ROS 2 e Ciclo de Vida
Comparativo entre versões legadas e o **ROS 2 Jazzy Jalisco** (LTS com suporte oficial até Maio de 2029).`,
      },
      {
        orderIndex: 6,
        title: 'Install Ubuntu 24.04 on a Virtual Machine VirtualBox',
        slug: '006-install-ubuntu-24-04-virtualbox',
        type: 'video',
        videoStatus: 'available',
        youtubeVideoId: 'ad3gJpq29_k',
        durationSeconds: 1125,
        content: `Passo a passo para instalação do Ubuntu 24.04 LTS no VirtualBox, alocando no mínimo 4GB de RAM e 2 vCPUs.`,
      },
      {
        orderIndex: 7,
        title: 'Note - New extension for VS Code',
        slug: '007-note-new-extension-for-vs-code',
        type: 'text',
        videoStatus: 'pending',
        youtubeVideoId: null,
        durationSeconds: 150,
        content: `Instalação da extensão oficial *Robot Developer Extensions for ROS 2* (Ranch Hand Robotics LLC) no VS Code.`,
      },
      {
        orderIndex: 8,
        title: 'Programming Tools I Will Use During this Course',
        slug: '008-programming-tools',
        type: 'video',
        videoStatus: 'available',
        youtubeVideoId: 'rZ3DIUC2nf0',
        durationSeconds: 309,
        content: `Apresentação do Terminator para gerenciamento multi-janela de terminal e configuração do Git.`,
      },
      {
        orderIndex: 9,
        title: 'Install ROS 2 Jazzy on Ubuntu 24 04',
        slug: '009-install-ros-2-jazzy-on-ubuntu-24-04',
        type: 'video',
        videoStatus: 'available',
        youtubeVideoId: 'fT1kAMNILHo',
        durationSeconds: 393,
        rosDocsUrl: 'https://docs.ros.org/en/jazzy/Installation/Ubuntu-Install-Debians.html',
        content: `### Instalação via Pacotes Debian Oficiais
\`\`\`bash
sudo apt update && sudo apt install -y locales
sudo locale-gen en_US en_US.UTF-8
sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
export LANG=en_US.UTF-8

sudo apt install -y software-properties-common curl
sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key -o /usr/share/keyrings/ros-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) main" | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null

sudo apt update && sudo apt install -y ros-jazzy-desktop python3-colcon-common-extensions
\`\`\``,
      },
      {
        orderIndex: 10,
        title: 'Set up your Environment for ROS 2',
        slug: '010-set-up-your-environment-for-ros-2',
        type: 'video',
        videoStatus: 'available',
        youtubeVideoId: 'yk0yCzzukes',
        durationSeconds: 183,
        content: `### Configuração do Arquivo ~/.bashrc
\`\`\`bash
echo "source /opt/ros/jazzy/setup.bash" >> ~/.bashrc
source ~/.bashrc
printenv ROS_DISTRO # Deve exibir 'jazzy'
\`\`\``,
      },
      {
        orderIndex: 11,
        title: 'Launch a ROS 2 Program',
        slug: '011-launch-a-ros-2-program',
        type: 'video',
        videoStatus: 'available',
        youtubeVideoId: 'sZrYZCLOtD0',
        durationSeconds: 144,
        content: `Execução do primeiro teste de comunicação talker/listener com nós padrão do sistema.`,
      },
      {
        orderIndex: 12,
        title: 'Section Conclusion',
        slug: '012-section-conclusion-install',
        type: 'text',
        videoStatus: 'pending',
        youtubeVideoId: null,
        durationSeconds: 120,
        content: `Recapitulação da instalação do ROS 2 Jazzy e validação do ambiente de compilação.`,
      },
    ],
  },
  {
    orderIndex: 3,
    title: '3. Write Your First ROS 2 Program',
    description: 'Criação de workspaces, pacotes em Python e C++, e implementação de nós orientados a objetos.',
    lessons: [
      { orderIndex: 13, title: 'Intro', slug: '013-intro-first-program', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 120, content: 'Introdução à criação de pacotes e nós no ROS 2.' },
      { orderIndex: 14, title: 'Create a ROS 2 Workspace', slug: '014-create-a-ros-2-workspace', type: 'video', videoStatus: 'available', youtubeVideoId: 'WKQsZcvR9xc', durationSeconds: 295, content: 'Estruturação do diretório ~/ros2_ws/src e build inicial com colcon.' },
      { orderIndex: 15, title: 'Create a Python Package', slug: '015-create-a-python-package', type: 'video', videoStatus: 'available', youtubeVideoId: 'xgmaN9PMx1A', durationSeconds: 472, content: 'Criação de pacotes com ros2 pkg create --build-type ament_python.' },
      { orderIndex: 16, title: 'Create a C Package', slug: '016-create-a-c-package', type: 'video', videoStatus: 'available', youtubeVideoId: 'h21KfN70deo', durationSeconds: 357, content: 'Criação de pacotes C++ com ros2 pkg create --build-type ament_cmake.' },
      { orderIndex: 17, title: 'What is a ROS2 Node', slug: '017-what-is-a-ros2-node', type: 'video', videoStatus: 'available', youtubeVideoId: 'nJTmymr-wNA', durationSeconds: 382, content: 'Conceito de nós como entidades computacionais independentes no grafo.' },
      { orderIndex: 18, title: 'Write a Python Node Minimal Code', slug: '018-write-a-python-node-minimal-code', type: 'video', videoStatus: 'available', youtubeVideoId: 'u8Xs4njxQcs', durationSeconds: 957, content: 'Estrutura mínima de um nó em Python com rclpy.init() e rclpy.spin().' },
      { orderIndex: 19, title: 'Write a Python Node With OOP', slug: '019-write-a-python-node-with-oop', type: 'video', videoStatus: 'available', youtubeVideoId: 'W9XrCCvGAzs', durationSeconds: 697, content: 'Implementação de nós herdando de rclpy.node.Node com temporizadores.' },
      { orderIndex: 20, title: 'Write a C Node Minimal Code', slug: '020-write-a-c-node-minimal-code', type: 'video', videoStatus: 'available', youtubeVideoId: 'VyLyA3t1dhs', durationSeconds: 974, content: 'Estrutura mínima de nó C++ com rclcpp::init() e RCLCPP_INFO.' },
      { orderIndex: 21, title: 'Write a C Node With OOP', slug: '021-write-a-c-node-with-oop', type: 'video', videoStatus: 'available', youtubeVideoId: 'mD-oNGYvShY', durationSeconds: 657, content: 'Implementação orientada a objetos em C++ com create_wall_timer.' },
      { orderIndex: 22, title: 'OOP Template for Your Nodes', slug: '022-oop-template-for-your-nodes', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 240, content: 'Templates oficiais reutilizáveis para Python e C++.' },
      { orderIndex: 23, title: 'More about the ROS 2 Client Libraries for Different Languages', slug: '023-more-about-client-libraries', type: 'video', videoStatus: 'available', youtubeVideoId: '_gBl9Oz556c', durationSeconds: 146, content: 'Arquitetura do rcl, rclcpp, rclpy e suporte a Rust.' },
      { orderIndex: 24, title: 'Section Conclusion', slug: '024-section-conclusion-first-program', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 150, content: 'Resumo e boas práticas na criação de pacotes.' },
    ],
  },
  {
    orderIndex: 4,
    title: '4. Introduction to ROS 2 Tools',
    description: 'Ferramentas de introspecção via CLI, rqt_graph, turtlesim e a primeira atividade prática desafiadora.',
    lessons: [
      { orderIndex: 25, title: 'Intro', slug: '025-intro-tools', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 120, content: 'Apresentação das ferramentas de introspecção do ROS 2.' },
      { orderIndex: 26, title: 'Introspect Your Nodes With ros2 cli', slug: '026-introspect-your-nodes-with-ros2-cli', type: 'video', videoStatus: 'available', youtubeVideoId: 'VhJsnvmSUT8', durationSeconds: 473, content: 'Uso de ros2 node list e ros2 node info.' },
      { orderIndex: 27, title: 'Rename a Node at Runtime', slug: '027-rename-a-node-at-runtime', type: 'video', videoStatus: 'available', youtubeVideoId: 'wuW3sS1_bEc', durationSeconds: 251, content: 'Remapeamento com --ros-args -r __node:=meu_no.' },
      { orderIndex: 28, title: 'Colcon', slug: '028-colcon', type: 'video', videoStatus: 'available', youtubeVideoId: 'AtSwbD8v4k4', durationSeconds: 325, content: 'Compilação com colcon build --symlink-install.' },
      { orderIndex: 29, title: 'Rqt and rqt graph', slug: '029-rqt-and-rqt-graph', type: 'video', videoStatus: 'available', youtubeVideoId: 'wf3PVYpycBw', durationSeconds: 218, content: 'Visualização gráfica de nós e tópicos com rqt_graph.' },
      { orderIndex: 30, title: 'Discover Turtlesim', slug: '030-discover-turtlesim', type: 'video', videoStatus: 'available', youtubeVideoId: 'uz_P27vmN5E', durationSeconds: 307, content: 'Execução do simulador turtlesim_node.' },
      { orderIndex: 31, title: 'Activity 01', slug: '031-activity-01', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 300, content: 'Desafio prático: Executar simultaneamente nós com nomes remapeados.' },
      { orderIndex: 32, title: 'Activity 01 Solution', slug: '032-activity-01-solution', type: 'video', videoStatus: 'available', youtubeVideoId: '616fIcUvMC0', durationSeconds: 292, content: 'Resolução detalhada da Atividade 01 com comandos CLI.' },
      { orderIndex: 33, title: 'Section Conclusion', slug: '033-section-conclusion-tools', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 150, content: 'Conclusão da seção de ferramentas.' },
    ],
  },
  {
    orderIndex: 5,
    title: '5. ROS 2 Topics - Make Your Nodes Communicate',
    description: 'Comunicação assíncrona Publish/Subscribe, publicadores, subscritores e controle do Turtlesim.',
    lessons: [
      { orderIndex: 34, title: 'Intro', slug: '034-intro-topics', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 120, content: 'Conceitos de Publish/Subscribe unidirecional.' },
      { orderIndex: 35, title: 'What is a ROS 2 Topic', slug: '035-what-is-a-ros-2-topic', type: 'video', videoStatus: 'available', youtubeVideoId: 'SIZgkdNaneI', durationSeconds: 492, content: 'Definição de barramento de tópicos e tipos de mensagens.' },
      { orderIndex: 36, title: 'Write a Python Publisher', slug: '036-write-a-python-publisher', type: 'video', videoStatus: 'available', youtubeVideoId: 'qLNXagKuZSc', durationSeconds: 1176, content: 'Criação de publicador com create_publisher em Python.' },
      { orderIndex: 37, title: 'Write a Python Subscriber', slug: '037-write-a-python-subscriber', type: 'video', videoStatus: 'available', youtubeVideoId: 'Vb3cXMYD5Cs', durationSeconds: 690, content: 'Criação de subscritor com create_subscription em Python.' },
      { orderIndex: 38, title: 'Write a C Publisher', slug: '038-write-a-c-publisher', type: 'video', videoStatus: 'available', youtubeVideoId: '6lfVGZHKdTk', durationSeconds: 1081, content: 'Implementação de publicador em C++.' },
      { orderIndex: 39, title: 'Write a C Subscriber', slug: '039-write-a-c-subscriber', type: 'video', videoStatus: 'available', youtubeVideoId: 'icZ8Ad0tGYA', durationSeconds: 772, content: 'Implementação de subscritor em C++.' },
      { orderIndex: 40, title: 'Introspect ROS 2 Topics with CLI Tools', slug: '040-introspect-ros-2-topics-cli', type: 'video', videoStatus: 'available', youtubeVideoId: 'tFOhJuGNoS4', durationSeconds: 552, content: 'ros2 topic list, echo, hz e pub.' },
      { orderIndex: 41, title: 'Remap a Topic at Runtime', slug: '041-remap-a-topic-at-runtime', type: 'video', videoStatus: 'available', youtubeVideoId: '-EsPK_ZTy-g', durationSeconds: 251, content: 'Remapeamento dinâmico de tópicos via linha de comando.' },
      { orderIndex: 42, title: 'Monitor Topics With rqt and rqt graph', slug: '042-monitor-topics-rqt-graph', type: 'video', videoStatus: 'available', youtubeVideoId: 'u7SAZtr58MM', durationSeconds: 402, content: 'Inspeção dinâmica no rqt_graph.' },
      { orderIndex: 43, title: 'Experiment on Topics with Turtlesim', slug: '043-experiment-on-topics-with-turtlesim', type: 'video', videoStatus: 'available', youtubeVideoId: '6dqtj3jvoJY', durationSeconds: 456, content: 'Controle de /turtle1/cmd_vel e leitura de /turtle1/pose.' },
      { orderIndex: 44, title: 'Activity 02 - ROS 2 Topics', slug: '044-activity-02-topics', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 300, content: 'Desafio: Desenvolver number_publisher e number_counter acumulador.' },
      { orderIndex: 45, title: 'Activity 02 Solution 1 2', slug: '045-activity-02-solution-1-2', type: 'video', videoStatus: 'available', youtubeVideoId: 'xrsWq5008rs', durationSeconds: 631, content: 'Implementação do number_publisher.' },
      { orderIndex: 46, title: 'Activity 02 Solution 2 2', slug: '046-activity-02-solution-2-2', type: 'video', videoStatus: 'available', youtubeVideoId: 'twuY-8ePBAM', durationSeconds: 835, content: 'Implementação do number_counter acumulador.' },
      { orderIndex: 47, title: 'Extra Replay Topic Data with Bags', slug: '047-extra-replay-topic-data-bags', type: 'video', videoStatus: 'available', youtubeVideoId: '-dfzoF3XOaU', durationSeconds: 608, content: 'Gravação e reprodução com ros2 bag record e play.' },
      { orderIndex: 48, title: 'Section Conclusion', slug: '048-section-conclusion-topics', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 150, content: 'Recapitulação da comunicação por tópicos.' },
    ],
  },
  {
    orderIndex: 6,
    title: '6. ROS 2 Services - Client Server Communication',
    description: 'Comunicação Request/Response com serviços, servidores e clientes síncronos e assíncronos.',
    lessons: [
      { orderIndex: 49, title: 'Intro', slug: '049-intro-services', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 120, content: 'Conceito de cliente/servidor síncrono e assíncrono.' },
      { orderIndex: 50, title: 'What is a ROS 2 Service', slug: '050-what-is-a-ros-2-service', type: 'video', videoStatus: 'available', youtubeVideoId: '0dqSzZHpLm8', durationSeconds: 388, content: 'Diferenças essenciais entre Tópicos e Serviços.' },
      { orderIndex: 51, title: 'Write a Python Service Server', slug: '051-write-a-python-service-server', type: 'video', videoStatus: 'available', youtubeVideoId: 'lUVh-hUSpYY', durationSeconds: 894, content: 'Implementação de servidor de serviço em Python.' },
      { orderIndex: 52, title: 'Write a Python Service Client no OOP', slug: '052-write-a-python-service-client-no-oop', type: 'video', videoStatus: 'available', youtubeVideoId: 'aZkyWiWGE8s', durationSeconds: 794, content: 'Chamada síncrona simples com wait_for_service.' },
      { orderIndex: 53, title: 'Write a Python Service Client OOP', slug: '053-write-a-python-service-client-oop', type: 'video', videoStatus: 'available', youtubeVideoId: 'FPmmlX5umwI', durationSeconds: 773, content: 'Cliente orientado a objetos com call_async e futures.' },
      { orderIndex: 54, title: 'Write a C Service Server', slug: '054-write-a-c-service-server', type: 'video', videoStatus: 'available', youtubeVideoId: '9_wuK1jLtvo', durationSeconds: 818, content: 'Implementação de servidor em C++.' },
      { orderIndex: 55, title: 'Write a C Service Client no OOP', slug: '055-write-a-c-service-client-no-oop', type: 'video', videoStatus: 'available', youtubeVideoId: 'oKkYslRcdpc', durationSeconds: 747, content: 'Cliente funcional C++ com spin_until_future_complete.' },
      { orderIndex: 56, title: 'Write a C Service Client OOP', slug: '056-write-a-c-service-client-oop', type: 'video', videoStatus: 'available', youtubeVideoId: 'M0sfCb-I8jA', durationSeconds: 770, content: 'Cliente robusto orientado a objetos em C++.' },
      { orderIndex: 57, title: 'Introspect Services with the ros2 Command Line', slug: '057-introspect-services-cli', type: 'video', videoStatus: 'available', youtubeVideoId: 'lLu5SmYTuec', durationSeconds: 449, content: 'ros2 service list, type e call.' },
      { orderIndex: 58, title: 'Remap a Service at Runtime', slug: '058-remap-a-service-at-runtime', type: 'video', videoStatus: 'available', youtubeVideoId: 'xPv6ZanZvYQ', durationSeconds: 164, content: 'Remapeamento de serviços com --ros-args.' },
      { orderIndex: 59, title: 'Experiment on Services with Turtlesim', slug: '059-experiment-services-turtlesim', type: 'video', videoStatus: 'available', youtubeVideoId: 'mc9sTD6DNIM', durationSeconds: 452, content: 'Uso dos serviços /spawn e /kill no turtlesim.' },
      { orderIndex: 60, title: 'Activity 03 - ROS 2 Services', slug: '060-activity-03-services', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 300, content: 'Desafio: Adicionar serviço /reset_counter ao number_counter.' },
      { orderIndex: 61, title: 'Activity 03 Solution', slug: '061-activity-03-solution', type: 'video', videoStatus: 'available', youtubeVideoId: '0aCpAFkDSjU', durationSeconds: 660, content: 'Solução da Atividade 03 em Python e C++.' },
      { orderIndex: 62, title: 'Section Conclusion', slug: '062-section-conclusion-services', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 150, content: 'Recapitulação sobre serviços assíncronos.' },
    ],
  },
  {
    orderIndex: 7,
    title: '7. Create Custom ROS 2 Interfaces Msg and Srv',
    description: 'Criação de pacotes de interfaces com mensagens (.msg) e serviços (.srv) customizados.',
    lessons: [
      { orderIndex: 63, title: 'Intro', slug: '063-intro-interfaces', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 120, content: 'Introdução a tipos customizados.' },
      { orderIndex: 64, title: 'What are ROS 2 Interfaces', slug: '064-what-are-ros-2-interfaces', type: 'video', videoStatus: 'available', youtubeVideoId: '8t0VmOdgnuc', durationSeconds: 614, content: 'Tipos primitivos e estruturas de mensagens.' },
      { orderIndex: 65, title: 'Create and Build Your First Custom Msg', slug: '065-create-and-build-custom-msg', type: 'video', videoStatus: 'available', youtubeVideoId: 'ig2lSU2dbQ8', durationSeconds: 706, content: 'Criação de HardwareStatus.msg com rosidl_default_generators.' },
      { orderIndex: 66, title: 'Use Your Custom Msg in a Python Node', slug: '066-use-custom-msg-python', type: 'video', videoStatus: 'available', youtubeVideoId: 'zboAcXcL60c', durationSeconds: 571, content: 'Importação e publicação da mensagem customizada em Python.' },
      { orderIndex: 67, title: 'Use Your Custom Msg in a C Node', slug: '067-use-custom-msg-cpp', type: 'video', videoStatus: 'available', youtubeVideoId: 'Y2ArrQWJkk0', durationSeconds: 568, content: 'Include de headers C++ gerados.' },
      { orderIndex: 68, title: 'Create and Build Your First Custom Srv', slug: '068-create-and-build-custom-srv', type: 'video', videoStatus: 'available', youtubeVideoId: 'nMS15MUUflM', durationSeconds: 351, content: 'Definição de ComputeRectangleArea.srv.' },
      { orderIndex: 69, title: 'Introspect Interfaces with the ros2 Command Line', slug: '069-introspect-interfaces-cli', type: 'video', videoStatus: 'available', youtubeVideoId: 'vT2EnePUvzk', durationSeconds: 321, content: 'ros2 interface list e show.' },
      { orderIndex: 70, title: 'Activity 04 - ROS 2 Custom Interfaces', slug: '070-activity-04-custom-interfaces', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 300, content: 'Desafio: Painel de LEDs e simulador de bateria com LedStateArray.msg.' },
      { orderIndex: 71, title: 'Activity 04 Solution 1 3', slug: '071-activity-04-solution-1-3', type: 'video', videoStatus: 'available', youtubeVideoId: 'DFUCVb4tm9k', durationSeconds: 634, content: 'Implementação de LedStateArray.msg.' },
      { orderIndex: 72, title: 'Activity 04 Solution 2 3', slug: '072-activity-04-solution-2-3', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 560, content: 'Implementação de SetLed.srv.' },
      { orderIndex: 73, title: 'Activity 04 Solution 3 3', slug: '073-activity-04-solution-3-3', type: 'video', videoStatus: 'available', youtubeVideoId: '6ZPLhbyhPLI', durationSeconds: 1348, content: 'Integração do nó battery com cliente de serviço.' },
      { orderIndex: 74, title: 'Section Conclusion', slug: '074-section-conclusion-interfaces', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 150, content: 'Conclusão de interfaces customizadas.' },
    ],
  },
  {
    orderIndex: 8,
    title: '8. Change Node Settings at Runtime with Parameters',
    description: 'Parametrização estática e dinâmica de nós, arquivos YAML e validação com callbacks.',
    lessons: [
      { orderIndex: 75, title: 'Intro', slug: '075-intro-parameters', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 120, content: 'Conceito de parâmetros no ROS 2.' },
      { orderIndex: 76, title: 'What is a ROS 2 Parameter', slug: '076-what-is-a-ros-2-parameter', type: 'video', videoStatus: 'available', youtubeVideoId: 'P-TlnQrm7PY', durationSeconds: 171, content: 'Parâmetros por nó e tipagem estática.' },
      { orderIndex: 77, title: 'Using Parameters in your Python Nodes', slug: '077-parameters-in-python', type: 'video', videoStatus: 'available', youtubeVideoId: 'hNzpsMAZ9Tw', durationSeconds: 707, content: 'declare_parameter e get_parameter em Python.' },
      { orderIndex: 78, title: 'Using Parameters in your C Nodes', slug: '078-parameters-in-cpp', type: 'video', videoStatus: 'available', youtubeVideoId: 'n7AngQtAY5I', durationSeconds: 490, content: 'declare_parameter em C++.' },
      { orderIndex: 79, title: 'Experiment on Parameters with Turtlesim', slug: '079-parameters-turtlesim', type: 'video', videoStatus: 'available', youtubeVideoId: 'ynDdTnXJUns', durationSeconds: 458, content: 'Configuração dinâmica de cores do Turtlesim.' },
      { orderIndex: 80, title: 'YAML Parameter Files', slug: '080-yaml-parameter-files', type: 'video', videoStatus: 'available', youtubeVideoId: 'VFn8vvvN_LY', durationSeconds: 573, content: 'Estruturação hierárquica e injeção com --params-file.' },
      { orderIndex: 81, title: 'Activity 05 - ROS 2 Parameters', slug: '081-activity-05-parameters', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 300, content: 'Desafio: Parametrizar nome da estação de rádio e estado dos LEDs.' },
      { orderIndex: 82, title: 'Activity 05 Solution 1 2', slug: '082-activity-05-solution-1-2', type: 'video', videoStatus: 'available', youtubeVideoId: 'yXS1-zyZS90', durationSeconds: 386, content: 'Solução da parametrização do rádio.' },
      { orderIndex: 83, title: 'Activity 05 Solution 2 2', slug: '083-activity-05-solution-2-2', type: 'video', videoStatus: 'available', youtubeVideoId: 'E_WY0yGy1Sg', durationSeconds: 455, content: 'Carregamento do arquivo led_config.yaml.' },
      { orderIndex: 84, title: 'Extra Parameter Callbacks', slug: '084-extra-parameter-callbacks', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 610, content: 'add_on_set_parameters_callback para validação em runtime.' },
      { orderIndex: 85, title: 'Section Conclusion', slug: '085-section-conclusion-parameters', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 150, content: 'Boas práticas na gestão de configurações.' },
    ],
  },
  {
    orderIndex: 9,
    title: '9. Scale Your Application With ROS 2 Launch Files',
    description: 'Orquestração multi-nó com launch files XML e Python, namespaces e injeção de parâmetros.',
    lessons: [
      { orderIndex: 86, title: 'Intro', slug: '086-intro-launch-files', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 120, content: 'Necessidade de launch files para sistemas complexos.' },
      { orderIndex: 87, title: 'What is a ROS 2 Launch File', slug: '087-what-is-a-launch-file', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 360, content: 'Inicialização paralela e determinística.' },
      { orderIndex: 88, title: 'Create and Install a Launch File XML', slug: '088-create-launch-file-xml', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 580, content: 'Launch files em XML no padrão Jazzy e diretivas de instalação.' },
      { orderIndex: 89, title: 'Python Launch Files Python vs XML', slug: '089-python-launch-files-vs-xml', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 520, content: 'Comparativo: clareza do XML vs programabilidade do Python.' },
      { orderIndex: 90, title: 'Remappings in a Launch File', slug: '090-remappings-in-launch-file', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 410, content: 'Configuração de tags <remap> dentro de launch files.' },
      { orderIndex: 91, title: 'Load Parameters in a Launch File', slug: '091-load-parameters-in-launch-file', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 470, content: 'Injeção de arquivos YAML via tags <param>.' },
      { orderIndex: 92, title: 'Add Namespaces to Your Nodes', slug: '092-add-namespaces-to-nodes', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 540, content: 'Agrupamento e isolamento de nós em frotas.' },
      { orderIndex: 93, title: 'Activity 06 - ROS 2 Launch Files', slug: '093-activity-06-launch-files', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 300, content: 'Desafio: Orquestrar 5 emissoras de rádio e receptor via XML.' },
      { orderIndex: 94, title: 'Activity 06 Solution', slug: '094-activity-06-solution', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 590, content: 'Solução completa do radio.launch.xml.' },
      { orderIndex: 95, title: 'Section Conclusion', slug: '095-section-conclusion-launch-files', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 150, content: 'Boas práticas em pacotes _bringup.' },
    ],
  },
  {
    orderIndex: 10,
    title: '10. Complete Project With Turtlesim ("Catch Them All")',
    description: 'Projeto capstone final integrando nós distribuídos, controle P, interfaces customizadas e launch files.',
    lessons: [
      { orderIndex: 96, title: 'Turtlesim Project - Final Result Overview', slug: '096-turtlesim-project-final-result-overview', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 420, content: 'Demonstração da tartaruga mestre caçando alvos na tela.' },
      { orderIndex: 97, title: 'Your Challenge', slug: '097-your-challenge-capstone', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 360, content: 'Especificação dos requisitos do sistema completo.' },
      { orderIndex: 98, title: 'Some Tips to Get Started', slug: '098-some-tips-to-get-started', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 480, content: 'Dicas de arquitetura, nós turtle_controller e turtle_spawner.' },
      { orderIndex: 99, title: 'Project Solution 1 6', slug: '099-project-solution-1-6', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 820, content: 'Etapa 1: Controlador P proporcional para coordenadas arbitrárias.' },
      { orderIndex: 100, title: 'Project Solution 2 6', slug: '100-project-solution-2-6', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 760, content: 'Etapa 2: Spawner temporizado com chamada ao serviço /spawn.' },
      { orderIndex: 101, title: 'Project Solution 3 6', slug: '101-project-solution-3-6', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 790, content: 'Etapa 3: Publicação da lista de tartarugas em /alive_turtles.' },
      { orderIndex: 102, title: 'Project Solution 4 6', slug: '102-project-solution-4-6', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 850, content: 'Etapa 4: Serviço /catch_turtle e remoção de alvos capturados.' },
      { orderIndex: 103, title: 'Project Solution 5 6', slug: '103-project-solution-5-6', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 540, content: 'Etapa 5: Algoritmo de menor distância euclidiana.' },
      { orderIndex: 104, title: 'Project Solution 6 6', slug: '104-project-solution-6-6', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 670, content: 'Etapa 6: Parametrização e launch file XML unificado.' },
      { orderIndex: 105, title: 'Project Conclusion', slug: '105-project-conclusion', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 180, content: 'Parabéns pela conclusão do projeto capstone autônomo!' },
    ],
  },
  {
    orderIndex: 11,
    title: '11. Conclusion',
    description: 'Síntese de conhecimentos adquiridos e orientação sobre os próximos passos em robótica avançada.',
    lessons: [
      { orderIndex: 106, title: 'What You ve Learned', slug: '106-what-you-have-learned', type: 'video', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 380, content: 'Revisão das competências desenvolvidas no curso.' },
      { orderIndex: 107, title: 'What to do next How to learn more about ROS 2', slug: '107-what-to-do-next', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 300, content: 'Recursos oficiais recomendados e comunidade ROS Discourse.' },
      { orderIndex: 108, title: 'Bonus Lecture', slug: '108-bonus-lecture', type: 'text', videoStatus: 'pending', youtubeVideoId: null, durationSeconds: 360, content: 'Próximos passos: Navegação com Nav2, TF2, RViz2 e simulação no Gazebo Harmonic.' },
    ],
  },
];

// ============================================================================
// EXERCÍCIOS E ATIVIDADES PRÁTICAS
// ============================================================================

interface ExerciseSeedItem {
  lessonOrderIndex: number;
  title: string;
  type: ExerciseType;
  prompt: string;
  starterCode?: string;
  solutionCode?: string;
  hints: string;
  points: number;
}

const EXERCISES_DATA: ExerciseSeedItem[] = [
  // ---------------------------------------------------------------------------
  // 1. ATIVIDADE 01 (Lesson 31)
  // ---------------------------------------------------------------------------
  {
    lessonOrderIndex: 31,
    title: 'Atividade 01: Introspecção e Remapeamento de Nós',
    type: 'TASK' as ExerciseType,
    prompt: `Inicie 4 nós simultaneamente no terminal, garantindo nomes customizados:
1. O nó Python criado anteriormente renomeado para "meu_no_py".
2. O nó C++ renomeado para "meu_no_cpp".
3. Dois nós de simulação do Turtlesim ("turtlesim_1" e "turtlesim_2").
Verifique o grafo no rqt_graph.`,
    starterCode: `# Inicie os 4 nós no terminal utilizando as flags de remapeamento do ROS 2:
# 1. Nó Python:
# ros2 run my_py_pkg my_first_node --ros-args -r __node:=...
# 2. Nó C++:
# ros2 run my_cpp_pkg my_first_node --ros-args -r __node:=...
# 3. Turtlesim 1 & 2:
# ros2 run turtlesim turtlesim_node --ros-args -r __node:=...
# 4. Inspecione o grafo:
# rqt_graph`,
    solutionCode: `ros2 run my_py_pkg my_first_node --ros-args -r __node:=meu_no_py
ros2 run my_cpp_pkg my_first_node --ros-args -r __node:=meu_no_cpp
ros2 run turtlesim turtlesim_node --ros-args -r __node:=turtlesim_1
ros2 run turtlesim turtlesim_node --ros-args -r __node:=turtlesim_2
rqt_graph`,
    hints: JSON.stringify([
      'Use a flag --ros-args',
      'Utilize a sintaxe -r __node:=<novo_nome>',
      'Abra o rqt_graph em um novo terminal para inspecionar o grafo',
    ]),
    points: 10,
  },

  // ---------------------------------------------------------------------------
  // 2. ATIVIDADE 02 (Lesson 44)
  // ---------------------------------------------------------------------------
  {
    lessonOrderIndex: 44,
    title: 'Atividade 02: Tópicos Publicador e Contador Acumulador',
    type: 'CODE' as ExerciseType,
    prompt: `Implemente dois nós em Python ou C++:
1. "number_publisher": publica periodicamente o número 2 no tópico "/number" (tipo Int64).
2. "number_counter": subscreve a "/number", acumula a soma e publica o total no tópico "/number_count".`,
    starterCode: `import rclpy
from rclpy.node import Node
from example_interfaces.msg import Int64

class NumberPublisher(Node):
    def __init__(self):
        super().__init__("number_publisher")
        # TODO: Crie o publicador e temporizador
        self.publisher_ = None
        self.timer_ = None

    def publish_number(self):
        # TODO: Publique o número 2
        pass

def main(args=None):
    rclpy.init(args=args)
    node = NumberPublisher()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()`,
    solutionCode: `import rclpy
from rclpy.node import Node
from example_interfaces.msg import Int64

class NumberPublisher(Node):
    def __init__(self):
        super().__init__("number_publisher")
        self.publisher_ = self.create_publisher(Int64, "number", 10)
        self.timer_ = self.create_timer(1.0, self.publish_number)

    def publish_number(self):
        msg = Int64()
        msg.data = 2
        self.publisher_.publish(msg)

def main(args=None):
    rclpy.init(args=args)
    node = NumberPublisher()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()`,
    hints: JSON.stringify([
      'Use example_interfaces.msg.Int64',
      'Lembre-se de registrar o entry point no setup.py',
      'Use create_subscription e create_publisher',
    ]),
    points: 20,
  },

  // ---------------------------------------------------------------------------
  // 3. ATIVIDADE 03 (Lesson 60)
  // ---------------------------------------------------------------------------
  {
    lessonOrderIndex: 60,
    title: 'Atividade 03: Servidor de Serviço de Reset',
    type: 'CODE' as ExerciseType,
    prompt: `Estenda o nó "number_counter" para fornecer um servidor de serviço "/reset_counter" utilizando o tipo "example_interfaces/srv/SetBool".
Quando data for True, reinicie o contador para zero e retorne sucesso.`,
    starterCode: `import rclpy
from rclpy.node import Node
from example_interfaces.msg import Int64
from example_interfaces.srv import SetBool

class NumberCounterNode(Node):
    def __init__(self):
        super().__init__("number_counter")
        self.counter_ = 0
        # TODO: Crie o publisher para "number_count"
        # TODO: Crie o subscription para "number"
        # TODO: Crie o service server "reset_counter" (SetBool)

    def callback_reset_counter(self, request, response):
        # TODO: Se request.data for True, zere o contador
        return response

def main(args=None):
    rclpy.init(args=args)
    node = NumberCounterNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()`,
    solutionCode: `#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from example_interfaces.msg import Int64
from example_interfaces.srv import SetBool

class NumberCounterNode(Node):
    def __init__(self):
        super().__init__("number_counter")
        self.counter_ = 0
        self.number_count_publisher_ = self.create_publisher(
            Int64, "number_count", 10)
        self.number_subscriber_ = self.create_subscription(
            Int64, "number", self.callback_number, 10)
        self.reset_counter_service_ = self.create_service(
            SetBool, "reset_counter", self.callback_reset_counter)
        self.get_logger().info("Number Counter has been started.")

    def callback_number(self, msg: Int64):
        self.counter_ += msg.data
        new_msg = Int64()
        new_msg.data = self.counter_
        self.number_count_publisher_.publish(new_msg)

    def callback_reset_counter(self, request: SetBool.Request, response: SetBool.Response):
        if request.data:
            self.counter_ = 0
            response.success = True
            response.message = "Counter has been reset"
        else:
            response.success = False
            response.message = "Counter has not been reset"
        return response

def main(args=None):
    rclpy.init(args=args)
    node = NumberCounterNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()`,
    hints: JSON.stringify([
      'Use create_service(SetBool, "reset_counter", callback)',
      'Retorne o objeto response preenchido',
      'Importe rclpy e rclpy.node.Node',
    ]),
    points: 20,
  },

  // ---------------------------------------------------------------------------
  // 4. ATIVIDADE 04 (Lesson 70)
  // ---------------------------------------------------------------------------
  {
    lessonOrderIndex: 70,
    title: 'Atividade 04: Painel de LEDs e Bateria com Interfaces Customizadas',
    type: 'CODE' as ExerciseType,
    prompt: `Crie o pacote "my_robot_interfaces" contendo:
1. "LedStateArray.msg" (array de inteiros int64[] led_states)
2. "SetLed.srv" (requisição com int64 led_number e int64 state; resposta com bool success)

Em seguida, desenvolva o nó servidor "led_panel" (que gerencia o estado dos LEDs e publica em "/led_panel_state") e o nó cliente "battery" (que simula o consumo da bateria e chama o serviço "/set_led" para acender um LED de alerta quando a bateria estiver descarregada e apagá-lo após recarregar).`,
    starterCode: `import rclpy
from rclpy.node import Node
# TODO: Importe as interfaces customizadas:
# from my_robot_interfaces.msg import LedStateArray
# from my_robot_interfaces.srv import SetLed

class LEDPanelNode(Node):
    def __init__(self):
        super().__init__("led_panel")
        self.led_states_ = [0, 0, 0]
        # TODO 1: Crie o publisher para o tópico 'led_panel_state' (LedStateArray, fila: 10)
        # TODO 2: Crie o timer periódico (ex: 5.0s) para publicar o estado atual dos LEDs
        # TODO 3: Crie o service server 'set_led' (SetLed) associado ao callback_set_led
        self.get_logger().info("LED panel node has been started.")

    def publish_led_states(self):
        # TODO: Instancie LedStateArray, atribua self.led_states_ e publique
        pass

    def callback_set_led(self, request, response):
        # TODO: Valide led_number e state (0 ou 1)
        # Se válido: atualize self.led_states_, publique o novo estado e responda success = True
        # Se inválido: responda success = False
        return response

def main(args=None):
    rclpy.init(args=args)
    node = LEDPanelNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()`,
    solutionCode: `#!/usr/bin/env python3
# ============================================================================
# 1. DEFINIÇÃO DAS INTERFACES CUSTOMIZADAS (my_robot_interfaces)
# ============================================================================
# msg/LedStateArray.msg:
#   int64[] led_states
#
# srv/SetLed.srv:
#   int64 led_number
#   int64 state
#   ---
#   bool success

# ============================================================================
# 2. NÓ SERVIDOR E PUBLICADOR: led_panel.py
# ============================================================================
import rclpy
from rclpy.node import Node
from my_robot_interfaces.msg import LedStateArray
from my_robot_interfaces.srv import SetLed

class LEDPanelNode(Node):
    def __init__(self):
        super().__init__("led_panel")
        self.led_states_ = [0, 0, 0]
        self.led_states_pub_ = self.create_publisher(
            LedStateArray, "led_panel_state", 10
        )
        self.led_states_timer_ = self.create_timer(
            5.0, self.publish_led_states
        )
        self.set_led_service_ = self.create_service(
            SetLed, "set_led", self.callback_set_led
        )
        self.get_logger().info("LED panel node has been started.")

    def publish_led_states(self):
        msg = LedStateArray()
        msg.led_states = self.led_states_
        self.led_states_pub_.publish(msg)

    def callback_set_led(self, request: SetLed.Request, response: SetLed.Response):
        led_number = request.led_number
        state = request.state

        if led_number >= len(self.led_states_) or led_number < 0:
            response.success = False
            return response

        if state not in [0, 1]:
            response.success = False
            return response

        self.led_states_[led_number] = state
        self.publish_led_states()
        response.success = True
        return response

# ============================================================================
# 3. NÓ CLIENTE: battery.py
# ============================================================================
class BatteryNode(Node):
    def __init__(self):
        super().__init__("battery")
        self.battery_state_ = "full"
        self.last_time_battery_state_changed_ = self.get_current_time_seconds()
        self.battery_timer_ = self.create_timer(0.1, self.check_battery_state)
        self.set_led_client_ = self.create_client(SetLed, "set_led")
        self.get_logger().info("Battery node has been started.")

    def get_current_time_seconds(self):
        seconds, nanoseconds = self.get_clock().now().seconds_nanoseconds()
        return seconds + nanoseconds / 1000000000.0

    def check_battery_state(self):
        time_now = self.get_current_time_seconds()
        if self.battery_state_ == "full":
            if time_now - self.last_time_battery_state_changed_ > 4.0:
                self.battery_state_ = "empty"
                self.get_logger().info("Battery is empty! Charging...")
                self.call_set_led(2, 1)
                self.last_time_battery_state_changed_ = time_now
        elif self.battery_state_ == "empty":
            if time_now - self.last_time_battery_state_changed_ > 6.0:
                self.battery_state_ = "full"
                self.get_logger().info("Battery is now full.")
                self.call_set_led(2, 0)
                self.last_time_battery_state_changed_ = time_now

    def call_set_led(self, led_number, state):
        while not self.set_led_client_.wait_for_service(1.0):
            self.get_logger().warn("Waiting for Set Led service...")

        request = SetLed.Request()
        request.led_number = led_number
        request.state = state

        future = self.set_led_client_.call_async(request)
        future.add_done_callback(self.callback_call_set_led)

    def callback_call_set_led(self, future):
        response: SetLed.Response = future.result()
        if response.success:
            self.get_logger().info("LED state was changed")
        else:
            self.get_logger().info("LED not changed")

def main(args=None):
    rclpy.init(args=args)
    node = LEDPanelNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()`,
    hints: JSON.stringify([
      'No pacote my_robot_interfaces (CMakeLists.txt), configure rosidl_default_generators e declare msg/LedStateArray.msg e srv/SetLed.srv.',
      'No arquivo SetLed.srv, separe os campos de requisição (led_number, state) e resposta (success) com "---".',
      'No nó led_panel, valide os limites do array antes de aplicar a alteração no índice especificado.',
      'No nó battery, utilize self.set_led_client_.call_async(request) com callback para não bloquear a thread principal.',
    ]),
    points: 25,
  },

  // ---------------------------------------------------------------------------
  // 5. ATIVIDADE 05 (Lesson 81)
  // ---------------------------------------------------------------------------
  {
    lessonOrderIndex: 81,
    title: 'Atividade 05: Parametrização Dinâmica via Arquivo YAML',
    type: 'CODE' as ExerciseType,
    prompt: `Parametrize nós ROS 2 dinamicamente em tempo de execução:
1. No nó "led_panel", declare o parâmetro "led_states" (array de inteiros com default [0, 0, 0]) e leia seu valor no construtor.
2. No nó "robot_news_station", declare o parâmetro "robot_name" (string com default "C3PO") e utilize-o ao compor as mensagens publicadas em "/robot_news".
3. Crie o arquivo "led_config.yaml" para configurar o painel de LEDs e execute o nó injetando as configurações via flag --params-file.`,
    starterCode: `# ============================================================================
# 1. Estrutura do arquivo de parâmetros: config/led_config.yaml
# ============================================================================
# /led_panel:
#   ros__parameters:
#     # TODO: Declare a lista led_states com 4 LEDs (ex: [0, 0, 0, 0])

# ============================================================================
# 2. Código do nó com leitura de parâmetros: led_panel.py
# ============================================================================
import rclpy
from rclpy.node import Node
from my_robot_interfaces.msg import LedStateArray

class LEDPanelNode(Node):
    def __init__(self):
        super().__init__("led_panel")
        # TODO 1: Declare o parâmetro "led_states" com valor default [0, 0, 0]
        # self.declare_parameter(...)

        # TODO 2: Obtenha o valor do parâmetro dinâmico
        # self.led_states_ = self.get_parameter(...).value
        self.led_states_ = [0, 0, 0]

        self.led_states_pub_ = self.create_publisher(
            LedStateArray, "led_panel_state", 10
        )
        self.led_states_timer_ = self.create_timer(
            5.0, self.publish_led_states
        )
        self.get_logger().info("LED panel iniciado com " + str(len(self.led_states_)) + " LEDs.")

    def publish_led_states(self):
        msg = LedStateArray()
        msg.led_states = self.led_states_
        self.led_states_pub_.publish(msg)

def main(args=None):
    rclpy.init(args=args)
    node = LEDPanelNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()`,
    solutionCode: `# ============================================================================
# 1. ARQUIVO DE CONFIGURAÇÃO YAML (yaml_params/led_config.yaml)
# ============================================================================
# /led_panel:
#   ros__parameters:
#     led_states: [0, 0, 0, 0]
#
# /robot_news_station:
#   ros__parameters:
#     robot_name: "Giskard"

# ============================================================================
# 2. NÓ PYTHON PARAMETRIZADO: led_panel.py
# ============================================================================
import rclpy
from rclpy.node import Node
from my_robot_interfaces.msg import LedStateArray
from my_robot_interfaces.srv import SetLed

class LEDPanelNode(Node):
    def __init__(self):
        super().__init__("led_panel")
        # 1. Declarar o parâmetro com tipo e valor padrão
        self.declare_parameter("led_states", [0, 0, 0])
        # 2. Ler o valor injetado no runtime (ou fallback default)
        self.led_states_ = self.get_parameter("led_states").value

        self.led_states_pub_ = self.create_publisher(
            LedStateArray, "led_panel_state", 10
        )
        self.led_states_timer_ = self.create_timer(
            5.0, self.publish_led_states
        )
        self.set_led_service_ = self.create_service(
            SetLed, "set_led", self.callback_set_led
        )
        self.get_logger().info(f"LED panel node iniciado com {len(self.led_states_)} LEDs.")

    def publish_led_states(self):
        msg = LedStateArray()
        msg.led_states = self.led_states_
        self.led_states_pub_.publish(msg)

    def callback_set_led(self, request: SetLed.Request, response: SetLed.Response):
        led_number = request.led_number
        state = request.state

        if led_number >= len(self.led_states_) or led_number < 0:
            response.success = False
            return response

        if state not in [0, 1]:
            response.success = False
            return response

        self.led_states_[led_number] = state
        self.publish_led_states()
        response.success = True
        return response

def main(args=None):
    rclpy.init(args=args)
    node = LEDPanelNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()

# ============================================================================
# 3. COMANDO CLI PARA INICIALIZAÇÃO COM ARQUIVO DE PARÂMETROS
# ============================================================================
# ros2 run my_py_pkg led_panel --ros-args --params-file src/my_py_pkg/config/led_config.yaml`,
    hints: JSON.stringify([
      'No arquivo YAML, a hierarquia estrita é /nome_do_no: seguido por ros__parameters: identado com 2 espaços.',
      'No nó Python, registre o parâmetro no __init__ com self.declare_parameter("led_states", [0, 0, 0]).',
      'Acesse o valor atribuído através de self.get_parameter("led_states").value.',
      'Para carregar o arquivo na execução via terminal, execute: ros2 run my_py_pkg led_panel --ros-args --params-file led_config.yaml',
    ]),
    points: 15,
  },

  // ---------------------------------------------------------------------------
  // 6. ATIVIDADE 06 (Lesson 93)
  // ---------------------------------------------------------------------------
  {
    lessonOrderIndex: 93,
    title: 'Atividade 06: Orquestração Multi-Nó com Launch XML',
    type: 'CODE' as ExerciseType,
    prompt: `Escreva o arquivo de launch XML "radio.launch.xml" e seu arquivo de parâmetros associado "radio_config.yaml" no pacote "my_robot_bringup".
O launch file deve iniciar concorrentemente:
1. 5 instâncias do nó "robot_news_station" (com nomes: robot_news_station_giskard, robot_news_station_bb8, robot_news_station_daneel, robot_news_station_jander, robot_news_station_c3po).
2. Cada instância deve receber seu respectivo "robot_name" a partir do arquivo YAML comum usando $(find-pkg-share).
3. 1 instância do nó receptor "smartphone" para receber todas as transmissões.`,
    starterCode: `<launch>
    <!-- TODO 1: Crie o nó robot_news_station com nome robot_news_station_giskard -->
    <!-- Injetando o arquivo radio_config.yaml via <param from="$(find-pkg-share ...)" /> -->
    <node pkg="my_py_pkg" exec="robot_news_station" name="robot_news_station_giskard">
        <!-- TODO: adicione a tag <param from="..." /> -->
    </node>

    <!-- TODO 2: Adicione as outras 4 instâncias de robôs: bb8, daneel, jander e c3po -->

    <!-- TODO 3: Adicione o nó receptor smartphone -->
    <!-- <node pkg="my_py_pkg" exec="smartphone" /> -->
</launch>`,
    solutionCode: `<launch>
    <!-- Instância 1: Robô Giskard -->
    <node pkg="my_py_pkg" exec="robot_news_station" name="robot_news_station_giskard">
        <param from="$(find-pkg-share my_robot_bringup)/config/radio_config.yaml" />
    </node>

    <!-- Instância 2: Robô BB8 -->
    <node pkg="my_py_pkg" exec="robot_news_station" name="robot_news_station_bb8">
        <param from="$(find-pkg-share my_robot_bringup)/config/radio_config.yaml" />
    </node>

    <!-- Instância 3: Robô Daneel -->
    <node pkg="my_py_pkg" exec="robot_news_station" name="robot_news_station_daneel">
        <param from="$(find-pkg-share my_robot_bringup)/config/radio_config.yaml" />
    </node>

    <!-- Instância 4: Robô Jander -->
    <node pkg="my_py_pkg" exec="robot_news_station" name="robot_news_station_jander">
        <param from="$(find-pkg-share my_robot_bringup)/config/radio_config.yaml" />
    </node>

    <!-- Instância 5: Robô C3PO -->
    <node pkg="my_py_pkg" exec="robot_news_station" name="robot_news_station_c3po">
        <param from="$(find-pkg-share my_robot_bringup)/config/radio_config.yaml" />
    </node>

    <!-- Receptor único: Smartphone -->
    <node pkg="my_py_pkg" exec="smartphone" />
</launch>`,
    hints: JSON.stringify([
      'Utilize a tag <node pkg="my_py_pkg" exec="robot_news_station" name="..."> para renomear cada nó executado.',
      'Para apontar para o arquivo YAML instalado no pacote bringup, utilize a substituição <param from="$(find-pkg-share my_robot_bringup)/config/radio_config.yaml" />.',
      'No arquivo CMakeLists.txt do pacote my_robot_bringup, certifique-se de instalar os diretórios launch e config com: install(DIRECTORY launch config DESTINATION share/\${PROJECT_NAME}).',
      'Execute a orquestração executando: ros2 launch my_robot_bringup radio.launch.xml e inspecione o grafo com rqt_graph.',
    ]),
    points: 20,
  },

  // ---------------------------------------------------------------------------
  // 7. CAPSTONE ARQUITETURA GERAL (Lesson 97)
  // ---------------------------------------------------------------------------
  {
    lessonOrderIndex: 97,
    title: 'Capstone: Turtlesim "Catch Them All" - Arquitetura Geral',
    type: 'TASK' as ExerciseType,
    prompt: `Desenhe a arquitetura do projeto e crie as interfaces customizadas ROS 2 necessárias no pacote "my_robot_interfaces":
- Nós: turtlesim_node, turtle_controller, turtle_spawner.
- Tópicos: /turtle1/cmd_vel (geometry_msgs/Twist), /turtle1/pose (turtlesim/Pose), /alive_turtles (my_robot_interfaces/TurtleArray).
- Serviços: /spawn (turtlesim/Spawn), /kill (turtlesim/Kill), /catch_turtle (my_robot_interfaces/CatchTurtle).
Defina as mensagens Turtle.msg, TurtleArray.msg e o serviço CatchTurtle.srv.`,
    starterCode: `# 1. Crie o pacote de interfaces na raiz do seu workspace colcon:
cd ~/ros2_ws/src
ros2 pkg create my_robot_interfaces

# 2. Crie os diretórios de mensagens e serviços:
cd my_robot_interfaces
mkdir msg srv

# TODO: Crie msg/Turtle.msg com os campos: name (string), x (float64), y (float64), theta (float64)
# TODO: Crie msg/TurtleArray.msg com o array de tartarugas: Turtle[] turtles
# TODO: Crie srv/CatchTurtle.srv com campo name na requisição e success na resposta
# TODO: Configure package.xml e CMakeLists.txt com rosidl_default_generators`,
    solutionCode: `# ==============================================================================
# 1. Definições de Interfaces Customizadas (my_robot_interfaces)
# ==============================================================================

# --- msg/Turtle.msg ---
string name
float64 x
float64 y
float64 theta

# --- msg/TurtleArray.msg ---
Turtle[] turtles

# --- srv/CatchTurtle.srv ---
string name
---
bool success

# ==============================================================================
# 2. Configuração de Compilação (CMakeLists.txt)
# ==============================================================================
cmake_minimum_required(VERSION 3.8)
project(my_robot_interfaces)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

find_package(ament_cmake REQUIRED)
find_package(rosidl_default_generators REQUIRED)

rosidl_generate_interfaces(\${PROJECT_NAME}
  "msg/Turtle.msg"
  "msg/TurtleArray.msg"
  "srv/CatchTurtle.srv"
)

ament_export_dependencies(rosidl_default_runtime)
ament_package()

# ==============================================================================
# 3. Compilação e Inspeção no Terminal
# ==============================================================================
colcon build --packages-select my_robot_interfaces
source install/setup.bash
ros2 interface show my_robot_interfaces/msg/TurtleArray
ros2 run turtlesim turtlesim_node`,
    hints: JSON.stringify([
      'Defina os tipos msg/Turtle.msg (name, x, y, theta), msg/TurtleArray.msg (Turtle[] turtles) e srv/CatchTurtle.srv (string name --- bool success)',
      'No CMakeLists.txt, use find_package(rosidl_default_generators REQUIRED) e liste os arquivos em rosidl_generate_interfaces()',
      'No package.xml, adicione <member_of_group>rosidl_interface_packages</member_of_group> e compile com colcon build --packages-select my_robot_interfaces',
    ]),
    points: 15,
  },

  // ---------------------------------------------------------------------------
  // 8. CAPSTONE ETAPA 1 (Lesson 99)
  // ---------------------------------------------------------------------------
  {
    lessonOrderIndex: 99,
    title: 'Capstone Etapa 1: Controlador Proporcional P para a Tartaruga',
    type: 'CODE' as ExerciseType,
    prompt: `Implemente o nó "turtle_controller" com controle proporcional P para movimentar "turtle1" até coordenadas (x, y) alvo utilizando /turtle1/cmd_vel e /turtle1/pose.`,
    starterCode: `#!/usr/bin/env python3
import math
import rclpy
from rclpy.node import Node
from turtlesim.msg import Pose
from geometry_msgs.msg import Twist

class TurtleControllerNode(Node):
    def __init__(self):
        super().__init__("turtle_controller")
        self.target_x = 2.0
        self.target_y = 8.0
        self.pose_: Pose = None

        # TODO: Criar publicador para /turtle1/cmd_vel (Twist, fila 10)
        # TODO: Criar subscrição para /turtle1/pose (Pose, callback_pose, fila 10)
        # TODO: Criar timer para a malha de controle em 100Hz (0.01s)
        self.cmd_vel_publisher_ = None
        self.pose_subscriber_ = None
        self.control_loop_timer_ = None

    def callback_pose(self, pose: Pose):
        self.pose_ = pose

    def control_loop(self):
        if self.pose_ is None:
            return

        # TODO: Calcular distância euclidiana até (target_x, target_y)
        # TODO: Se distance > 0.5:
        #       - cmd.linear.x = 2.0 * distance
        #       - Calcular ângulo com math.atan2(dist_y, dist_x) e normalizar erro angular em [-pi, pi]
        #       - cmd.angular.z = 6.0 * diff
        #       Senão parar a tartaruga (linear.x = 0.0, angular.z = 0.0)
        # TODO: Publicar comando cmd
        pass

def main(args=None):
    rclpy.init(args=args)
    node = TurtleControllerNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()`,
    solutionCode: `#!/usr/bin/env python3
import math
import rclpy
from rclpy.node import Node
from turtlesim.msg import Pose
from geometry_msgs.msg import Twist

class TurtleControllerNode(Node):
    def __init__(self):
        super().__init__("turtle_controller")
        self.target_x = 2.0
        self.target_y = 8.0
        self.pose_: Pose = None
        self.cmd_vel_publisher_ = self.create_publisher(
            Twist, "/turtle1/cmd_vel", 10)
        self.pose_subscriber_ = self.create_subscription(
            Pose, "/turtle1/pose", self.callback_pose, 10)
        self.control_loop_timer_ = self.create_timer(
            0.01, self.control_loop)

    def callback_pose(self, pose: Pose):
        self.pose_ = pose

    def control_loop(self):
        if self.pose_ is None:
            return

        dist_x = self.target_x - self.pose_.x
        dist_y = self.target_y - self.pose_.y
        distance = math.sqrt(dist_x * dist_x + dist_y * dist_y)

        cmd = Twist()

        if distance > 0.5:
            # Controle Proporcional de Posição
            cmd.linear.x = 2.0 * distance

            # Controle Proporcional de Orientação
            goal_theta = math.atan2(dist_y, dist_x)
            diff = goal_theta - self.pose_.theta
            if diff > math.pi:
                diff -= 2 * math.pi
            elif diff < -math.pi:
                diff += 2 * math.pi
            cmd.angular.z = 6.0 * diff
        else:
            # Alvo alcançado - parar o robô
            cmd.linear.x = 0.0
            cmd.angular.z = 0.0

        self.cmd_vel_publisher_.publish(cmd)

def main(args=None):
    rclpy.init(args=args)
    node = TurtleControllerNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()`,
    hints: JSON.stringify([
      'distância = math.sqrt((self.target_x - self.pose_.x)**2 + (self.target_y - self.pose_.y)**2)',
      'Ângulo desejado: goal_theta = math.atan2(dist_y, dist_x). Normalize o erro angular: se diff > pi: diff -= 2*pi; se diff < -pi: diff += 2*pi',
      'Para o ganho P: cmd.linear.x = 2.0 * distance e cmd.angular.z = 6.0 * diff. Se distance <= 0.5, zere as velocidades lineares e angulares.',
    ]),
    points: 25,
  },

  // ---------------------------------------------------------------------------
  // 9. CAPSTONE ETAPA 2 (Lesson 100)
  // ---------------------------------------------------------------------------
  {
    lessonOrderIndex: 100,
    title: 'Capstone Etapa 2: Spawner Temporizado de Tartarugas',
    type: 'CODE' as ExerciseType,
    prompt: `Implemente o nó "turtle_spawner" que utiliza um temporizador e chama o serviço "/spawn" do Turtlesim com coordenadas aleatórias entre 0.0 e 11.0.`,
    starterCode: `#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from turtlesim.srv import Spawn
from functools import partial
import random
import math

class TurtleSpawnerNode(Node):
    def __init__(self):
        super().__init__("turtle_spawner")
        self.turtle_name_prefix_ = "turtle"
        self.turtle_counter_ = 0

        # TODO: Criar cliente do serviço Spawn em "/spawn"
        # TODO: Criar timer para gerar nova tartaruga a cada 2.0 segundos
        self.spawn_client_ = None
        self.spawn_turtle_timer_ = None

    def spawn_new_turtle(self):
        self.turtle_counter_ += 1
        name = self.turtle_name_prefix_ + str(self.turtle_counter_)
        # TODO: Gerar x e y aleatórios entre 0.0 e 11.0, e theta entre 0.0 e 2*pi
        # TODO: Chamar self.call_spawn_service(name, x, y, theta)
        pass

    def call_spawn_service(self, turtle_name, x, y, theta):
        # TODO: Aguardar o serviço "/spawn" ficar disponível
        # TODO: Criar Spawn.Request com x, y, theta, name
        # TODO: Chamar call_async com callback via future.add_done_callback
        pass

    def callback_call_spawn_service(self, future, request):
        response: Spawn.Response = future.result()
        if response.name != "":
            self.get_logger().info("Nova tartaruga criada: " + response.name)

def main(args=None):
    rclpy.init(args=args)
    node = TurtleSpawnerNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()`,
    solutionCode: `#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from turtlesim.srv import Spawn
from functools import partial
import random
import math

class TurtleSpawnerNode(Node):
    def __init__(self):
        super().__init__("turtle_spawner")
        self.turtle_name_prefix_ = "turtle"
        self.turtle_counter_ = 0
        self.spawn_client_ = self.create_client(Spawn, "/spawn")
        self.spawn_turtle_timer_ = self.create_timer(2.0, self.spawn_new_turtle)

    def spawn_new_turtle(self):
        self.turtle_counter_ += 1
        name = self.turtle_name_prefix_ + str(self.turtle_counter_)
        x = random.uniform(0.0, 11.0)
        y = random.uniform(0.0, 11.0)
        theta = random.uniform(0.0, 2 * math.pi)
        self.call_spawn_service(name, x, y, theta)

    def call_spawn_service(self, turtle_name, x, y, theta):
        while not self.spawn_client_.wait_for_service(1.0):
            self.get_logger().warn("Aguardando serviço de spawn...")
        
        request = Spawn.Request()
        request.x = x
        request.y = y
        request.theta = theta
        request.name = turtle_name

        future = self.spawn_client_.call_async(request)
        future.add_done_callback(
            partial(self.callback_call_spawn_service, request=request))

    def callback_call_spawn_service(self, future, request):
        response: Spawn.Response = future.result()
        if response.name != "":
            self.get_logger().info("Nova tartaruga viva: " + response.name)

def main(args=None):
    rclpy.init(args=args)
    node = TurtleSpawnerNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()`,
    hints: JSON.stringify([
      'Importe turtlesim.srv.Spawn e crie o cliente com self.create_client(Spawn, "/spawn")',
      'Gere coordenadas aleatórias usando random.uniform(0.0, 11.0) e theta com random.uniform(0.0, 2 * math.pi)',
      'Utilize self.spawn_client_.call_async(request) e future.add_done_callback(partial(self.callback_call_spawn_service, request=request)) para processar a resposta sem bloquear a thread',
    ]),
    points: 20,
  },

  // ---------------------------------------------------------------------------
  // 10. CAPSTONE ETAPA 3 (Lesson 101)
  // ---------------------------------------------------------------------------
  {
    lessonOrderIndex: 101,
    title: 'Capstone Etapa 3: Gerenciamento do Array de Tartarugas Vivas',
    type: 'CODE' as ExerciseType,
    prompt: `Armazene em memória as tartarugas criadas e publique a lista continuamente no tópico "/alive_turtles" utilizando TurtleArray.msg. No turtle_controller, subscreva ao tópico e defina o primeiro elemento como o alvo atual.`,
    starterCode: `#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from functools import partial
import random
import math
from turtlesim.srv import Spawn
from my_robot_interfaces.msg import Turtle
from my_robot_interfaces.msg import TurtleArray

class TurtleSpawnerNode(Node):
    def __init__(self):
        super().__init__("turtle_spawner")
        self.turtle_name_prefix_ = "turtle"
        self.turtle_counter_ = 0
        self.alive_turtles_ = []

        # TODO: Criar publicador para o tópico "alive_turtles" (TurtleArray, fila 10)
        self.alive_turtles_publisher_ = None
        self.spawn_client_ = self.create_client(Spawn, "/spawn")
        self.spawn_turtle_timer_ = self.create_timer(2.0, self.spawn_new_turtle)

    def publish_alive_turtles(self):
        # TODO: Montar mensagem TurtleArray com self.alive_turtles_ e publicar
        pass

    def callback_call_spawn_service(self, future, request: Spawn.Request):
        response: Spawn.Response = future.result()
        if response.name != "":
            # TODO: Criar objeto Turtle(name, x, y, theta), adicionar em self.alive_turtles_
            # TODO: Invocar self.publish_alive_turtles()
            pass`,
    solutionCode: `#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from functools import partial
import random
import math
from turtlesim.srv import Spawn
from my_robot_interfaces.msg import Turtle
from my_robot_interfaces.msg import TurtleArray

class TurtleSpawnerNode(Node):
    def __init__(self):
        super().__init__("turtle_spawner")
        self.turtle_name_prefix_ = "turtle"
        self.turtle_counter_ = 0
        self.alive_turtles_ = []
        self.alive_turtles_publisher_ = self.create_publisher(
            TurtleArray, "alive_turtles", 10)
        self.spawn_client_ = self.create_client(Spawn, "/spawn")
        self.spawn_turtle_timer_ = self.create_timer(2.0, self.spawn_new_turtle)

    def publish_alive_turtles(self):
        msg = TurtleArray()
        msg.turtles = self.alive_turtles_
        self.alive_turtles_publisher_.publish(msg)

    def spawn_new_turtle(self):
        self.turtle_counter_ += 1
        name = self.turtle_name_prefix_ + str(self.turtle_counter_)
        x = random.uniform(0.0, 11.0)
        y = random.uniform(0.0, 11.0)
        theta = random.uniform(0.0, 2 * math.pi)
        self.call_spawn_service(name, x, y, theta)

    def call_spawn_service(self, turtle_name, x, y, theta):
        while not self.spawn_client_.wait_for_service(1.0):
            self.get_logger().warn("Aguardando serviço de spawn...")
        
        request = Spawn.Request()
        request.x = x
        request.y = y
        request.theta = theta
        request.name = turtle_name

        future = self.spawn_client_.call_async(request)
        future.add_done_callback(
            partial(self.callback_call_spawn_service, request=request))

    def callback_call_spawn_service(self, future, request: Spawn.Request):
        response: Spawn.Response = future.result()
        if response.name != "":
            self.get_logger().info("Nova tartaruga viva: " + response.name)
            new_turtle = Turtle()
            new_turtle.name = response.name
            new_turtle.x = request.x
            new_turtle.y = request.y
            new_turtle.theta = request.theta
            self.alive_turtles_.append(new_turtle)
            self.publish_alive_turtles()

def main(args=None):
    rclpy.init(args=args)
    node = TurtleSpawnerNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()`,
    hints: JSON.stringify([
      'Importe my_robot_interfaces.msg.Turtle e TurtleArray',
      'No callback do spawn, instancie Turtle(), atribua name = response.name e as coordenadas do request, adicione a self.alive_turtles_',
      'Publique o TurtleArray com self.alive_turtles_publisher_.publish(msg) logo após cada alteração no array de tartarugas vivas',
    ]),
    points: 20,
  },

  // ---------------------------------------------------------------------------
  // 11. CAPSTONE ETAPA 4 (Lesson 102)
  // ---------------------------------------------------------------------------
  {
    lessonOrderIndex: 102,
    title: 'Capstone Etapa 4: Serviço de Captura e Remoção',
    type: 'CODE' as ExerciseType,
    prompt: `Crie o serviço "/catch_turtle" (CatchTurtle.srv). Quando o controlador alcançar a tartaruga alvo, requisite a captura para que o spawner chame /kill e remova a tartaruga da lista.`,
    starterCode: `#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from functools import partial
from turtlesim.srv import Kill
from my_robot_interfaces.srv import CatchTurtle
from my_robot_interfaces.msg import TurtleArray

class TurtleSpawnerNode(Node):
    def __init__(self):
        super().__init__("turtle_spawner")
        self.alive_turtles_ = []
        # TODO: Criar cliente para o serviço "/kill" (turtlesim.srv.Kill)
        # TODO: Criar servidor para o serviço "catch_turtle" (CatchTurtle)
        self.kill_client_ = None
        self.catch_turtle_service_ = None

    def callback_catch_turtle(self, request: CatchTurtle.Request, response: CatchTurtle.Response):
        # TODO: Chamar self.call_kill_service(request.name)
        # TODO: response.success = True e retornar response
        pass

    def call_kill_service(self, turtle_name):
        # TODO: Criar requisição Kill.Request(name=turtle_name) e disparar call_async
        pass

    def callback_call_kill_service(self, future, turtle_name):
        # TODO: Encontrar tartaruga em self.alive_turtles_, deletar e republicar array
        pass`,
    solutionCode: `#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from functools import partial
import random
import math
from turtlesim.srv import Spawn
from turtlesim.srv import Kill
from my_robot_interfaces.msg import Turtle
from my_robot_interfaces.msg import TurtleArray
from my_robot_interfaces.srv import CatchTurtle

class TurtleSpawnerNode(Node):
    def __init__(self):
        super().__init__("turtle_spawner")
        self.turtle_name_prefix_ = "turtle"
        self.turtle_counter_ = 0
        self.alive_turtles_ = []
        self.alive_turtles_publisher_ = self.create_publisher(
            TurtleArray, "alive_turtles", 10)
        self.spawn_client_ = self.create_client(Spawn, "/spawn")
        self.kill_client_ = self.create_client(Kill, "/kill")
        self.catch_turtle_service_ = self.create_service(
            CatchTurtle, "catch_turtle", self.callback_catch_turtle)
        self.spawn_turtle_timer_ = self.create_timer(2.0, self.spawn_new_turtle)

    def callback_catch_turtle(self, request: CatchTurtle.Request, response: CatchTurtle.Response):
        self.call_kill_service(request.name)
        response.success = True
        return response

    def publish_alive_turtles(self):
        msg = TurtleArray()
        msg.turtles = self.alive_turtles_
        self.alive_turtles_publisher_.publish(msg)

    def spawn_new_turtle(self):
        self.turtle_counter_ += 1
        name = self.turtle_name_prefix_ + str(self.turtle_counter_)
        x = random.uniform(0.0, 11.0)
        y = random.uniform(0.0, 11.0)
        theta = random.uniform(0.0, 2 * math.pi)
        self.call_spawn_service(name, x, y, theta)

    def call_spawn_service(self, turtle_name, x, y, theta):
        while not self.spawn_client_.wait_for_service(1.0):
            self.get_logger().warn("Aguardando serviço de spawn...")
        
        request = Spawn.Request()
        request.x = x
        request.y = y
        request.theta = theta
        request.name = turtle_name

        future = self.spawn_client_.call_async(request)
        future.add_done_callback(
            partial(self.callback_call_spawn_service, request=request))

    def callback_call_spawn_service(self, future, request: Spawn.Request):
        response: Spawn.Response = future.result()
        if response.name != "":
            self.get_logger().info("Nova tartaruga viva: " + response.name)
            new_turtle = Turtle()
            new_turtle.name = response.name
            new_turtle.x = request.x
            new_turtle.y = request.y
            new_turtle.theta = request.theta
            self.alive_turtles_.append(new_turtle)
            self.publish_alive_turtles()

    def call_kill_service(self, turtle_name):
        while not self.kill_client_.wait_for_service(1.0):
            self.get_logger().warn("Aguardando serviço kill...")
        
        request = Kill.Request()
        request.name = turtle_name

        future = self.kill_client_.call_async(request)
        future.add_done_callback(
            partial(self.callback_call_kill_service, turtle_name=turtle_name))

    def callback_call_kill_service(self, future, turtle_name):
        for (i, turtle) in enumerate(self.alive_turtles_):
            if turtle.name == turtle_name:
                del self.alive_turtles_[i]
                self.publish_alive_turtles()
                break

def main(args=None):
    rclpy.init(args=args)
    node = TurtleSpawnerNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()`,
    hints: JSON.stringify([
      'No turtle_spawner, instancie o servidor com self.create_service(CatchTurtle, "catch_turtle", self.callback_catch_turtle) e o cliente com self.create_client(Kill, "/kill")',
      'Ao receber a requisição de captura, invoque o serviço /kill para remover a tartaruga do Turtlesim e remova-a de self.alive_turtles_',
      'No turtle_controller, quando distance <= 0.5, chame o serviço /catch_turtle passando o nome da tartaruga e defina self.turtle_to_catch_ = None',
    ]),
    points: 25,
  },

  // ---------------------------------------------------------------------------
  // 12. CAPSTONE ETAPA 5 (Lesson 103)
  // ---------------------------------------------------------------------------
  {
    lessonOrderIndex: 103,
    title: 'Capstone Etapa 5: Algoritmo de Menor Distância Euclidiana',
    type: 'CODE' as ExerciseType,
    prompt: `Melhore o turtle_controller para varrer todas as tartarugas vivas em /alive_turtles e selecionar a tartaruga mais próxima para captura calculando a distância euclidiana.`,
    starterCode: `#!/usr/bin/env python3
import math
import rclpy
from functools import partial
from rclpy.node import Node
from turtlesim.msg import Pose
from geometry_msgs.msg import Twist
from my_robot_interfaces.msg import Turtle
from my_robot_interfaces.msg import TurtleArray
from my_robot_interfaces.srv import CatchTurtle

class TurtleControllerNode(Node):
    def __init__(self):
        super().__init__("turtle_controller")
        self.turtle_to_catch_: Turtle = None
        self.pose_: Pose = None

        self.cmd_vel_publisher_ = self.create_publisher(Twist, "/turtle1/cmd_vel", 10)
        self.pose_subscriber_ = self.create_subscription(Pose, "/turtle1/pose", self.callback_pose, 10)
        self.alive_turtles_subscriber_ = self.create_subscription(
            TurtleArray, "alive_turtles", self.callback_alive_turtles, 10)
        self.catch_turtle_client_ = self.create_client(CatchTurtle, "catch_turtle")
        self.control_loop_timer_ = self.create_timer(0.01, self.control_loop)

    def callback_pose(self, pose: Pose):
        self.pose_ = pose

    def callback_alive_turtles(self, msg: TurtleArray):
        if len(msg.turtles) > 0:
            # TODO: Inicializar closest_turtle = None e closest_turtle_distance = None
            # TODO: Iterar sobre turtle em msg.turtles:
            #       dist_x = turtle.x - self.pose_.x
            #       dist_y = turtle.y - self.pose_.y
            #       distance = math.sqrt(dist_x**2 + dist_y**2)
            #       atualizar se for a menor distância
            # TODO: self.turtle_to_catch_ = closest_turtle
            pass`,
    solutionCode: `#!/usr/bin/env python3
import math
import rclpy
from functools import partial
from rclpy.node import Node
from turtlesim.msg import Pose
from geometry_msgs.msg import Twist
from my_robot_interfaces.msg import Turtle
from my_robot_interfaces.msg import TurtleArray
from my_robot_interfaces.srv import CatchTurtle

class TurtleControllerNode(Node):
    def __init__(self):
        super().__init__("turtle_controller")
        self.turtle_to_catch_: Turtle = None
        self.pose_: Pose = None
        self.cmd_vel_publisher_ = self.create_publisher(
            Twist, "/turtle1/cmd_vel", 10)
        self.pose_subscriber_ = self.create_subscription(
            Pose, "/turtle1/pose", self.callback_pose, 10)
        self.alive_turtles_subscriber_ = self.create_subscription(
            TurtleArray, "alive_turtles", self.callback_alive_turtles, 10)
        self.catch_turtle_client_ = self.create_client(CatchTurtle, "catch_turtle")
        self.control_loop_timer_ = self.create_timer(
            0.01, self.control_loop)

    def callback_pose(self, pose: Pose):
        self.pose_ = pose

    def callback_alive_turtles(self, msg: TurtleArray):
        if len(msg.turtles) > 0:
            closest_turtle = None
            closest_turtle_distance = None

            for turtle in msg.turtles:
                dist_x = turtle.x - self.pose_.x
                dist_y = turtle.y - self.pose_.y
                distance = math.sqrt(dist_x * dist_x + dist_y * dist_y)
                if closest_turtle is None or distance < closest_turtle_distance:
                    closest_turtle = turtle
                    closest_turtle_distance = distance

            self.turtle_to_catch_ = closest_turtle

    def control_loop(self):
        if self.pose_ is None or self.turtle_to_catch_ is None:
            return

        dist_x = self.turtle_to_catch_.x - self.pose_.x
        dist_y = self.turtle_to_catch_.y - self.pose_.y
        distance = math.sqrt(dist_x * dist_x + dist_y * dist_y)

        cmd = Twist()

        if distance > 0.5:
            # Posição proporcional
            cmd.linear.x = 2.0 * distance

            # Orientação proporcional
            goal_theta = math.atan2(dist_y, dist_x)
            diff = goal_theta - self.pose_.theta
            if diff > math.pi:
                diff -= 2 * math.pi
            elif diff < -math.pi:
                diff += 2 * math.pi
            cmd.angular.z = 6.0 * diff
        else:
            # Alvo capturado
            cmd.linear.x = 0.0
            cmd.angular.z = 0.0
            self.call_catch_turtle_service(self.turtle_to_catch_.name)
            self.turtle_to_catch_ = None

        self.cmd_vel_publisher_.publish(cmd)

    def call_catch_turtle_service(self, turtle_name):
        while not self.catch_turtle_client_.wait_for_service(1.0):
            self.get_logger().warn("Aguardando serviço catch_turtle...")
        
        request = CatchTurtle.Request()
        request.name = turtle_name

        future = self.catch_turtle_client_.call_async(request)
        future.add_done_callback(
            partial(self.callback_call_catch_turtle_service, turtle_name=turtle_name))

    def callback_call_catch_turtle_service(self, future, turtle_name):
        response: CatchTurtle.Response = future.result()
        if not response.success:
            self.get_logger().error("Tartaruga " + turtle_name + " não pôde ser removida")

def main(args=None):
    rclpy.init(args=args)
    node = TurtleControllerNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()`,
    hints: JSON.stringify([
      'No callback de alive_turtles, itere sobre msg.turtles guardando closest_turtle e closest_turtle_distance',
      'Calcule a distância euclidiana com math.sqrt((turtle.x - self.pose_.x)**2 + (turtle.y - self.pose_.y)**2)',
      'Atualize self.turtle_to_catch_ com a tartaruga de menor distância encontrada no laço de repetição',
    ]),
    points: 25,
  },

  // ---------------------------------------------------------------------------
  // 13. CAPSTONE ETAPA 6 (Lesson 104)
  // ---------------------------------------------------------------------------
  {
    lessonOrderIndex: 104,
    title: 'Capstone Etapa 6: Parametrização e Launch XML Completo',
    type: 'CODE' as ExerciseType,
    prompt: `Parametrize o spawner (frequência de spawn, prefixo de nome) e crie o launch file XML "turtlesim_catch_them_all.launch.xml" que inicia todo o sistema robótico com um único comando.`,
    starterCode: `<!-- launch/turtlesim_catch_them_all.launch.xml -->
<launch>
    <!-- TODO: Iniciar nó turtlesim_node do pacote turtlesim -->
    
    <!-- TODO: Iniciar nó controller do pacote turtlesim_catch_them_all -->
    <!-- TODO: Injetar parâmetros a partir de catch_them_all_config.yaml -->

    <!-- TODO: Iniciar nó spawner do pacote turtlesim_catch_them_all -->
    <!-- TODO: Injetar parâmetros a partir de catch_them_all_config.yaml -->
</launch>`,
    solutionCode: `<!-- ============================================================================== -->
<!-- 1. Launch File XML: launch/turtlesim_catch_them_all.launch.xml                  -->
<!-- ============================================================================== -->
<launch>
    <node pkg="turtlesim" exec="turtlesim_node" />
    <node pkg="turtlesim_catch_them_all" exec="controller">
        <param from="$(find-pkg-share my_robot_bringup)/config/catch_them_all_config.yaml" />
    </node>
    <node pkg="turtlesim_catch_them_all" exec="spawner">
        <param from="$(find-pkg-share my_robot_bringup)/config/catch_them_all_config.yaml" />
    </node>
</launch>

<!-- ============================================================================== -->
<!-- 2. Arquivo de Configuração YAML: config/catch_them_all_config.yaml             -->
<!-- ============================================================================== -->
<!--
/turtle_controller:
  ros__parameters:
    catch_closest_turtle_first: True

/turtle_spawner:
  ros__parameters:
    turtle_name_prefix: "my_turtle"
    spawn_frequency: 1.5
-->

<!-- ============================================================================== -->
<!-- 3. Declaração de Parâmetros nos Nós Python (rclpy)                             -->
<!-- ============================================================================== -->
<!--
# Em TurtleControllerNode.__init__:
self.declare_parameter("catch_closest_turtle_first", True)
self.catch_closest_turtle_first_ = self.get_parameter("catch_closest_turtle_first").value

# Em TurtleSpawnerNode.__init__:
self.declare_parameter("turtle_name_prefix", "turtle")
self.declare_parameter("spawn_frequency", 1.0)
self.turtle_name_prefix_ = self.get_parameter("turtle_name_prefix").value
self.spawn_frequency_ = self.get_parameter("spawn_frequency").value
self.spawn_turtle_timer_ = self.create_timer(1.0 / self.spawn_frequency_, self.spawn_new_turtle)
-->`,
    hints: JSON.stringify([
      'No launch XML, use a tag <node pkg="pacote" exec="executavel"><param from="$(find-pkg-share pacote)/config/arquivo.yaml" /></node>',
      'No YAML de parâmetros, a raiz deve conter /turtle_controller: e /turtle_spawner: com seus blocos ros__parameters:',
      'Nos nós Python, declare os parâmetros com self.declare_parameter() e recupere os valores com self.get_parameter("nome").value',
    ]),
    points: 30,
  },
];

// ============================================================================
// FUNÇÃO PRINCIPAL DE SEED
// ============================================================================

async function main() {
  console.log('🚀 Iniciando Seeder do Sistema Autônomos (Milestone 1)...');

  // Demo accounts are opt-in and must never be seeded into production.
  if (process.env.SEED_DEMO_USERS === 'true') {
    if (process.env.NODE_ENV === 'production') throw new Error('Contas demonstrativas não são permitidas em produção.');
    console.log('👤 Criando integrantes padrão para testes e desenvolvimento...');
    const adminPasswordHash = await bcrypt.hash('Admin@Autonomos2026!', 10);
    const memberPasswordHash = await bcrypt.hash('Membro@2026!', 10);
    const studentPasswordHash = await bcrypt.hash('Aluno@2026!', 10);

    const admin = await prisma.member.upsert({
      where: { email: 'admin@autonomos.ufrj.br' },
      update: {
        name: 'Administrador UFRJ Autônomos',
        role: Role.ADMIN,
        status: 'APPROVED',
        credential: {
          upsert: {
            create: { passwordHash: adminPasswordHash },
            update: { passwordHash: adminPasswordHash },
          },
        },
      },
      create: {
        email: 'admin@autonomos.ufrj.br',
        name: 'Administrador UFRJ Autônomos',
        role: Role.ADMIN,
        status: 'APPROVED',
        credential: {
          create: { passwordHash: adminPasswordHash },
        },
      },
    });

    const member = await prisma.member.upsert({
      where: { email: 'membro@autonomos.ufrj.br' },
      update: {
        name: 'Engenheiro Harpia',
        role: Role.MEMBER,
        credential: {
          upsert: {
            create: { passwordHash: memberPasswordHash },
            update: { passwordHash: memberPasswordHash },
          },
        },
      },
      create: {
        email: 'membro@autonomos.ufrj.br',
        name: 'Engenheiro Harpia',
        role: Role.MEMBER,
        credential: {
          create: { passwordHash: memberPasswordHash },
        },
      },
    });

    const student = await prisma.member.upsert({
      where: { email: 'aluno@autonomos.ufrj.br' },
      update: {
        name: 'Aluno Teste',
        role: Role.TRAINEE,
        credential: {
          upsert: {
            create: { passwordHash: studentPasswordHash },
            update: { passwordHash: studentPasswordHash },
          },
        },
      },
      create: {
        email: 'aluno@autonomos.ufrj.br',
        name: 'Aluno Teste',
        role: Role.TRAINEE,
        credential: {
          create: { passwordHash: studentPasswordHash },
        },
      },
    });

    console.log(`✅ Integrantes criados: Admin (${admin.email}), Membro (${member.email}), Aluno (${student.email})`);
  }

  // 2. CURSO PADRÃO
  console.log('📚 Criando curso: "ROS 2 Jazzy para Iniciantes"...');
  const course = await prisma.course.upsert({
    where: { slug: 'ros2-jazzy' },
    update: {
      title: 'ROS 2 Jazzy para Iniciantes',
      description: 'Domine a versão LTS mais recente do Robot Operating System (ROS 2 Jazzy Jalisco) com Python, C++, launch files e simulação completa no Turtlesim.',
      badge: 'ROS 2 Jazzy',
      level: 'Iniciante',
      durationHours: 12.5,
      published: true,
    },
    create: {
      slug: 'ros2-jazzy',
      title: 'ROS 2 Jazzy para Iniciantes',
      description: 'Domine a versão LTS mais recente do Robot Operating System (ROS 2 Jazzy Jalisco) com Python, C++, launch files e simulação completa no Turtlesim.',
      badge: 'ROS 2 Jazzy',
      level: 'Iniciante',
      durationHours: 12.5,
      published: true,
    },
  });

  console.log(`✅ Curso registrado: [${course.id}] ${course.title} (slug: ${course.slug})`);

  // Mapeamento de lições por orderIndex para posterior associação de exercícios
  const lessonMap = new Map<number, string>();

  // 3. MÓDULOS E LIÇÕES
  console.log('📦 Populando 11 módulos e 108 lições sequenciais...');

  for (const modData of MODULES_DATA) {
    // Upsert do Módulo
    let currentModule = await prisma.module.findFirst({
      where: {
        courseId: course.id,
        orderIndex: modData.orderIndex,
      },
    });

    if (!currentModule) {
      currentModule = await prisma.module.create({
        data: {
          courseId: course.id,
          orderIndex: modData.orderIndex,
          title: modData.title,
          description: modData.description,
        },
      });
    } else {
      currentModule = await prisma.module.update({
        where: { id: currentModule.id },
        data: {
          title: modData.title,
          description: modData.description,
        },
      });
    }

    // Upsert das Lições do Módulo
    for (const lesData of modData.lessons) {
      const translated = translatedLessons[String(lesData.orderIndex)];
      const titleToUse = translated ? translated.title : lesData.title;
      const contentToUse = translated ? translated.content : lesData.content;
      const summaryToUse = translated ? translated.summary : null;

      const isText = lesData.type === 'text' || Boolean(translated && !lesData.youtubeVideoId);
      const lessonTypeEnum = isText ? LessonType.TEXT : LessonType.VIDEO;
      let videoStatusEnum: VideoStatus = VideoStatus.PENDING;
      if (isText) {
        videoStatusEnum = VideoStatus.TEXT_ONLY;
      } else if (lesData.videoStatus === 'available') {
        videoStatusEnum = VideoStatus.AVAILABLE;
      }

      let currentLesson = await prisma.lesson.findFirst({
        where: {
          moduleId: currentModule.id,
          orderIndex: lesData.orderIndex,
        },
      });

      if (!currentLesson) {
        currentLesson = await prisma.lesson.create({
          data: {
            moduleId: currentModule.id,
            orderIndex: lesData.orderIndex,
            title: titleToUse,
            slug: lesData.slug,
            lessonType: lessonTypeEnum,
            videoStatus: videoStatusEnum,
            youtubeVideoId: isText ? null : lesData.youtubeVideoId,
            videoDurationSeconds: lesData.durationSeconds,
            summary: summaryToUse,
            rosDocsUrl: lesData.rosDocsUrl,
            textContent: contentToUse,
          },
        });
      } else {
        currentLesson = await prisma.lesson.update({
          where: { id: currentLesson.id },
          data: {
            title: titleToUse,
            slug: lesData.slug,
            lessonType: lessonTypeEnum,
            videoStatus: videoStatusEnum,
            youtubeVideoId: isText ? null : lesData.youtubeVideoId,
            videoDurationSeconds: lesData.durationSeconds,
            summary: summaryToUse,
            rosDocsUrl: lesData.rosDocsUrl,
            textContent: contentToUse,
          },
        });
      }

      lessonMap.set(lesData.orderIndex, currentLesson.id);
    }
  }

  console.log(`✅ Todos os 11 módulos e 108 lições foram populados com sucesso!`);

  // 4. EXERCÍCIOS E ATIVIDADES PRÁTICAS
  console.log('🧪 Populando 13 exercícios práticos e desafios do capstone...');
  let exercisesCreated = 0;

  for (const exData of EXERCISES_DATA) {
    const lessonId = lessonMap.get(exData.lessonOrderIndex);
    if (!lessonId) {
      console.warn(`⚠️ Aula # ${exData.lessonOrderIndex} não encontrada para associar exercício.`);
      continue;
    }

    const existingExercise = await prisma.exercise.findFirst({
      where: {
        lessonId: lessonId,
      },
    });

    if (!existingExercise) {
      await prisma.exercise.create({
        data: {
          lessonId: lessonId,
          title: exData.title,
          type: exData.type,
          prompt: exData.prompt,
          starterCode: exData.starterCode,
          solutionCode: exData.solutionCode,
          hints: exData.hints,
          points: exData.points,
          orderIndex: 1,
        },
      });
    } else {
      await prisma.exercise.update({
        where: { id: existingExercise.id },
        data: {
          title: exData.title,
          type: exData.type,
          prompt: exData.prompt,
          starterCode: exData.starterCode,
          solutionCode: exData.solutionCode,
          hints: exData.hints,
          points: exData.points,
        },
      });
    }
    exercisesCreated++;
  }

  console.log(`✅ ${exercisesCreated} exercícios práticos foram cadastrados e associados.`);

  // Contagem de validação
  const totalLessons = await prisma.lesson.count();
  const totalModules = await prisma.module.count();
  const totalExercises = await prisma.exercise.count();
  const totalUsers = await prisma.member.count();

  console.log('📊 RESUMO DA PERSISTÊNCIA NO BANCO:');
  console.log(`   - Usuários: ${totalUsers}`);
  console.log(`   - Cursos: 1`);
  console.log(`   - Módulos: ${totalModules}`);
  console.log(`   - Lições: ${totalLessons}`);
  console.log(`   - Exercícios: ${totalExercises}`);
  console.log('🎉 Seeding concluído com êxito no banco Supabase!');
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal durante a execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
