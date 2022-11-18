import store from '../js/vuex-store';
import config from '../js/modules/config';
import { debugLog } from '../js/modules/tracking';

const About = () => import('../js/views/About.vue');
const Compass = () => import('../js/views/Compass.vue');
const Report = () => import('../js/views/Report.vue');
const Embed = () => import('../js/views/CompassEmbed.vue');

const routes = [
  {
    name: 'compass',
    path: '/:locale/compass/:metric/:geographyLevel?',
    component: Compass,
  },
  {
    name: 'report',
    path: '/:locale/report/:geographyLevel/',
    component: Report,
  },
  {
    name: 'embed',
    path: '/:locale/embed/:metric/:geographyLevel/',
    component: Embed,
  },
  {
    name: 'about',
    path: '/:locale/about/',
    component: About,
    beforeEnter() {
      store.commit('clearMetric');
    },
  },
  {
    name: 'homepage',
    path: '/:locale/',
    component: Compass,
    beforeEnter() {
      store.commit('clearMetric');
    },
  },
  {
    name: 'homepage-en',
    path: '/',
    redirect: { name: 'homepage', params: { locale: 'en' } },
  },
  {
    name: 'wildcard',
    path: '/:pathMatch(.*)/*',
    redirect: { name: 'homepage', params: { locale: 'en' } },
  },
];

const routerOptions = {
  encodeQuery: true,
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      return { selector: to.hash, offset: { x: 0, y: 60 } };
    } if (savedPosition) {
      return savedPosition;
    }
    return { x: 0, y: 0 };
  },
};

const setUpRouterHooks = function(router, store) {

// Validate params.
  // TODO: Refactor routeguards into a separate file.
// TODO: Make these dynamically pull valid values from config.
  router.beforeEach((to, from) => {
    debugLog('Route guard: Validate params');
    debugLog(`${from.path} => ${to.path}`);
    debugLog(to);

    if (to.name === 'compass' && !to.params.geographyLevel) {
      let geographyLevel = 'tract';
      if ('geographyLevel' in from.params) {
        geographyLevel = from.params.geographyLevel;
      }
      return {
        name: 'compass',
        params: {...to.params, geographyLevel}
      };
    }

    if (to.params.locale && ['en', 'es'].indexOf(to.params.locale) === -1) {
      return { ...to, params: { ...to.params, locale: 'en' } };
    } else if (to.params.geographyLevel && ['blockgroup', 'tract'].indexOf(to.params.geographyLevel) === -1) {
      return { ...to, params: { ...to.params, geographyLevel: 'tract' } };
    } else if (to.params.metric && !(`m${to.params.metric}` in config.dataConfig)) {
      return { name: 'homepage', params: { locale: ('locale' in to.params) ? to.params.locale : 'en' } };
    } else {
      store.commit('setRoute', to);
    }
  });

// // Load geography & selected on each route.
router.afterEach( (to, from) => {
  debugLog('Route guard: Load geography');
  debugLog(`${from.path} => ${to.path}`);

  if (to.name === 'report' && to.params.geographyLevel !== store.state.geography.id) {
    store.commit('setGeographyId', to.params.geographyLevel);
  }

  if ('mode' in to.query && to.query.mode === 'print') {
    store.commit('setPrintMode', true);
  } else if (store.state.printMode) {
    store.commit('setPrintMode', false);
  }

  // For compass routes only, load metric and set print mode.
  if ('metric' in to.params && 'geographyLevel' in to.params && (to.params.geographyLevel !== store.state.geography.id || store.state.metricId !== to.params.metric)) {
    store.dispatch('changeMetric', {
      newMetricId: to.params.metric,
      newGeographyId: to.params.geographyLevel,
    });
  }

  if (to.name === 'report') {
    if (!Object.keys(store.state.report.metrics).length || to.params.geographyLevel !== store.state.geography.id) {
      store.commit('populateMetrics', { geography: store.state.geography });
    }

    if ('visibleCategories' in to.query || 'visibleMetrics' in to.query) {
      store.commit('hideAllMetrics');
      if ('visibleCategories' in to.query) {
        [].concat(to.query.visibleCategories).forEach((category) => {
          store.commit('toggleCategory', { categoryName: category, visibility: true });
        });
      }
      if ('visibleMetrics' in to.query) {
        [].concat(to.query.visibleMetrics).forEach((metric) => {
          // TODO: Flag to make usage of m prefix consistent.
          store.commit('toggleMetric', { metricId: `m${metric}`, visibility: true });
        });
      }
    } else {
      store.commit('showAllMetrics');
    }

    if (!Object.keys(store.state.report.metricValues).length) {
      store.dispatch('loadData');
    }
  }
});

// Check that URL params match current state; in case the geography level has changed.
// router.beforeEach((to, from, next) => {
//   debugLog('Route guard: Set legend title & validate geography level');
//   debugLog(`${from.path} => ${to.path}`);
//
//   if (from.name === 'compass' && to.name !== 'compass') {
//     store.commit('setLastCompassRoute', from);
//   }
//
//   if ('legendTitle' in to.query) {
//     store.commit('setLegendTitle', to.query.legendTitle);
//   } else if (store.state.customLegendTitle !== '') {
//     store.commit('setLegendTitle', '');
//   }
//
//   if (store.state.geography.id !== to.params.geographyLevel) {
//     next({
//       ...to,
//       params: {
//         ...to.params,
//         geographyLevel: store.state.geography.id,
//       },
//       query: {
//         ...to.query,
//         selected: [],
//       },
//     });
//   } else {
//     next();
//   }
// });

  return router;
}

export { routerOptions, setUpRouterHooks };
