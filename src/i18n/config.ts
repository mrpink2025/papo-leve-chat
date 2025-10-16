import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  pt: {
    translation: {
      common: {
        back: 'Voltar',
        save: 'Salvar',
        cancel: 'Cancelar',
        delete: 'Excluir',
        edit: 'Editar',
        send: 'Enviar',
        search: 'Buscar',
        online: 'online',
        offline: 'offline',
      },
      chat: {
        typeMessage: 'Digite uma mensagem...',
        videoCall: 'Chamada de vídeo',
        audioCall: 'Chamada de áudio',
        videoCallStarted: '📹 Chamada de vídeo iniciada',
        audioCallStarted: '📞 Chamada de áudio iniciada',
      },
      settings: {
        title: 'Configurações',
        profile: 'Perfil',
        preferences: 'Preferências',
        theme: 'Tema',
        language: 'Idioma',
        username: 'Nome de usuário',
        fullName: 'Nome completo',
        bio: 'Bio',
        phone: 'Telefone',
        themes: {
          default: 'Padrão',
          dark: 'Escuro',
          blue: 'Azul',
          green: 'Verde',
          purple: 'Roxo',
        },
        languages: {
          pt: 'Português',
          en: 'English',
          es: 'Español',
        },
      },
      stories: {
        title: 'Stories',
        addStory: 'Adicionar Story',
        viewStory: 'Ver Story',
        views: 'visualizações',
      },
    },
  },
  en: {
    translation: {
      common: {
        back: 'Back',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        send: 'Send',
        search: 'Search',
        online: 'online',
        offline: 'offline',
      },
      chat: {
        typeMessage: 'Type a message...',
        videoCall: 'Video call',
        audioCall: 'Audio call',
        videoCallStarted: '📹 Video call started',
        audioCallStarted: '📞 Audio call started',
      },
      settings: {
        title: 'Settings',
        profile: 'Profile',
        preferences: 'Preferences',
        theme: 'Theme',
        language: 'Language',
        username: 'Username',
        fullName: 'Full Name',
        bio: 'Bio',
        phone: 'Phone',
        themes: {
          default: 'Default',
          dark: 'Dark',
          blue: 'Blue',
          green: 'Green',
          purple: 'Purple',
        },
        languages: {
          pt: 'Português',
          en: 'English',
          es: 'Español',
        },
      },
      stories: {
        title: 'Stories',
        addStory: 'Add Story',
        viewStory: 'View Story',
        views: 'views',
      },
    },
  },
  es: {
    translation: {
      common: {
        back: 'Volver',
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        edit: 'Editar',
        send: 'Enviar',
        search: 'Buscar',
        online: 'en línea',
        offline: 'desconectado',
      },
      chat: {
        typeMessage: 'Escribe un mensaje...',
        videoCall: 'Videollamada',
        audioCall: 'Llamada de audio',
        videoCallStarted: '📹 Videollamada iniciada',
        audioCallStarted: '📞 Llamada de audio iniciada',
      },
      settings: {
        title: 'Configuración',
        profile: 'Perfil',
        preferences: 'Preferencias',
        theme: 'Tema',
        language: 'Idioma',
        username: 'Nombre de usuario',
        fullName: 'Nombre completo',
        bio: 'Biografía',
        phone: 'Teléfono',
        themes: {
          default: 'Predeterminado',
          dark: 'Oscuro',
          blue: 'Azul',
          green: 'Verde',
          purple: 'Morado',
        },
        languages: {
          pt: 'Português',
          en: 'English',
          es: 'Español',
        },
      },
      stories: {
        title: 'Historias',
        addStory: 'Agregar Historia',
        viewStory: 'Ver Historia',
        views: 'vistas',
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt',
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
