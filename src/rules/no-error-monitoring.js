const MONITORING = /"(?:@sentry\/[\w-]+|sentry-[\w-]+|posthog-js|posthog-node|posthog-react-native|@bugsnag\/[\w-]+|rollbar|logrocket|@datadog\/browser-rum|@highlight-run\/[\w-]+|@honeybadger-io\/[\w-]+|@appsignal\/[\w-]+|newrelic|@newrelic\/[\w-]+)"\s*:/;

export default {
  id: 'no-error-monitoring',
  title: 'No error monitoring',
  category: 'reliability',
  severity: 'info',
  check(project) {
    if (!project.files.includes('package.json')) return [];
    if (MONITORING.test(project.read('package.json'))) return [];
    return [{
      file: 'package.json',
      message: 'No error-monitoring tool is installed, so you will not hear about crashes your users hit.',
      fix: 'Add a free tier of Sentry (`npx @sentry/wizard`) or PostHog so errors reach you before users complain.',
    }];
  },
};
