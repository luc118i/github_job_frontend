const DEVICON_BASE = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons';

// Maps lowercase skill name → devicon path (folder/file, no extension)
const DEVICON_MAP: Record<string, string> = {
  react:           'react/react-original',
  'next.js':       'nextjs/nextjs-original',
  nextjs:          'nextjs/nextjs-original',
  typescript:      'typescript/typescript-original',
  javascript:      'javascript/javascript-original',
  python:          'python/python-original',
  vue:             'vuejs/vuejs-original',
  'vue.js':        'vuejs/vuejs-original',
  angular:         'angularjs/angularjs-original',
  'node.js':       'nodejs/nodejs-original',
  node:            'nodejs/nodejs-original',
  rust:            'rust/rust-plain',
  go:              'go/go-original',
  golang:          'go/go-original',
  java:            'java/java-original',
  php:             'php/php-original',
  ruby:            'ruby/ruby-original',
  swift:           'swift/swift-original',
  kotlin:          'kotlin/kotlin-original',
  flutter:         'flutter/flutter-original',
  docker:          'docker/docker-original',
  kubernetes:      'kubernetes/kubernetes-plain',
  aws:             'amazonwebservices/amazonwebservices-plain',
  gcp:             'googlecloud/googlecloud-original',
  azure:           'azure/azure-original',
  'c++':           'cplusplus/cplusplus-original',
  'c#':            'csharp/csharp-original',
  graphql:         'graphql/graphql-plain',
  postgresql:      'postgresql/postgresql-original',
  postgres:        'postgresql/postgresql-original',
  mongodb:         'mongodb/mongodb-original',
  redis:           'redis/redis-original',
  mysql:           'mysql/mysql-original',
  html:            'html5/html5-original',
  css:             'css3/css3-original',
  tailwind:        'tailwindcss/tailwindcss-plain',
  tailwindcss:     'tailwindcss/tailwindcss-plain',
  git:             'git/git-original',
  linux:           'linux/linux-original',
  nginx:           'nginx/nginx-original',
  firebase:        'firebase/firebase-plain',
  figma:           'figma/figma-original',
  django:          'django/django-plain',
  laravel:         'laravel/laravel-original',
  spring:          'spring/spring-original',
  '.net':          'dotnetcore/dotnetcore-plain',
  dotnet:          'dotnetcore/dotnetcore-plain',
  elixir:          'elixir/elixir-original',
  scala:           'scala/scala-original',
  'r':             'r/r-original',
  pandas:          'pandas/pandas-original',
  numpy:           'numpy/numpy-original',
  tensorflow:      'tensorflow/tensorflow-original',
  pytorch:         'pytorch/pytorch-original',
  bash:            'bash/bash-original',
  vim:             'vim/vim-original',
  vscode:          'vscode/vscode-original',
  selenium:        'selenium/selenium-original',
  jest:            'jest/jest-plain',
  webpack:         'webpack/webpack-original',
  vite:            'vitejs/vitejs-original',
  electron:        'electron/electron-original',
  redux:           'redux/redux-original',
  sass:            'sass/sass-original',
  less:            'less/less-plain-wordmark',
};

export function getTechIconUrl(skill: string): string | null {
  const key = skill.toLowerCase().trim();
  const path = DEVICON_MAP[key];
  if (!path) return null;
  return `${DEVICON_BASE}/${path}.svg`;
}

// ── Source favicons ───────────────────────────────────────────

const SOURCE_DOMAINS: Record<string, string> = {
  'Remotive':       'remotive.com',
  'Gupy':           'gupy.io',
  'Adzuna':         'adzuna.com',
  'Indeed':         'indeed.com',
  'Glassdoor':      'glassdoor.com',
  'LinkedIn':       'linkedin.com',
  'Catho':          'catho.com.br',
  'InfoJobs':       'infojobs.com.br',
  'Vagas.com':      'vagas.com.br',
  'Trampos.co':     'trampos.co',
  'Programathor':   'programathor.com.br',
  'GeekHunter':     'geekhunter.com.br',
  '99jobs':         '99jobs.com',
  'BNE':            'bne.com.br',
  'Wellfound':      'wellfound.com',
  'Remotar':        'remotar.com.br',
  'X/Twitter':      'x.com',
  'Facebook':       'facebook.com',
  'Instagram':      'instagram.com',
  'Stack Overflow': 'stackoverflow.com',
  'Lever':          'lever.co',
  'Greenhouse':     'greenhouse.io',
  'Workable':       'workable.com',
  'Ashby':          'ashbyhq.com',
  'BambooHR':       'bamboohr.com',
  'SmartRecruiters':'smartrecruiters.com',
};

export function getSourceFaviconUrl(source: string): string | null {
  const domain = SOURCE_DOMAINS[source];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}
