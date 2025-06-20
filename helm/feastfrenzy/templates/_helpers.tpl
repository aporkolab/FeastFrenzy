{{/*
Expand the name of the chart.
*/}}
{{- define "feastfrenzy.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "feastfrenzy.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "feastfrenzy.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "feastfrenzy.labels" -}}
helm.sh/chart: {{ include "feastfrenzy.chart" . }}
{{ include "feastfrenzy.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: feastfrenzy
{{- end }}

{{/*
Selector labels
*/}}
{{- define "feastfrenzy.selectorLabels" -}}
app.kubernetes.io/name: {{ include "feastfrenzy.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Backend labels
*/}}
{{- define "feastfrenzy.backend.labels" -}}
{{ include "feastfrenzy.labels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "feastfrenzy.backend.selectorLabels" -}}
{{ include "feastfrenzy.selectorLabels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "feastfrenzy.frontend.labels" -}}
{{ include "feastfrenzy.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "feastfrenzy.frontend.selectorLabels" -}}
{{ include "feastfrenzy.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Create the name of the backend service account to use
*/}}
{{- define "feastfrenzy.backend.serviceAccountName" -}}
{{- if .Values.backend.serviceAccount.create }}
{{- default (printf "%s-backend" (include "feastfrenzy.fullname" .)) .Values.backend.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.backend.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the name of the frontend service account to use
*/}}
{{- define "feastfrenzy.frontend.serviceAccountName" -}}
{{- if .Values.frontend.serviceAccount.create }}
{{- default (printf "%s-frontend" (include "feastfrenzy.fullname" .)) .Values.frontend.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.frontend.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Return the backend image name
*/}}
{{- define "feastfrenzy.backend.image" -}}
{{- $tag := .Values.backend.image.tag | default .Chart.AppVersion -}}
{{- printf "%s:%s" .Values.backend.image.repository $tag }}
{{- end }}

{{/*
Return the frontend image name
*/}}
{{- define "feastfrenzy.frontend.image" -}}
{{- $tag := .Values.frontend.image.tag | default .Chart.AppVersion -}}
{{- printf "%s:%s" .Values.frontend.image.repository $tag }}
{{- end }}

{{/*
Return MySQL host
*/}}
{{- define "feastfrenzy.mysql.host" -}}
{{- if .Values.mysql.enabled }}
{{- printf "%s-mysql" (include "feastfrenzy.fullname" .) }}
{{- else }}
{{- .Values.externalDatabase.host }}
{{- end }}
{{- end }}

{{/*
Return MySQL port
*/}}
{{- define "feastfrenzy.mysql.port" -}}
{{- if .Values.mysql.enabled }}
{{- printf "3306" }}
{{- else }}
{{- .Values.externalDatabase.port | toString }}
{{- end }}
{{- end }}

{{/*
Return MySQL database name
*/}}
{{- define "feastfrenzy.mysql.database" -}}
{{- if .Values.mysql.enabled }}
{{- .Values.mysql.auth.database }}
{{- else }}
{{- .Values.externalDatabase.database }}
{{- end }}
{{- end }}

{{/*
Return MySQL username
*/}}
{{- define "feastfrenzy.mysql.username" -}}
{{- if .Values.mysql.enabled }}
{{- .Values.mysql.auth.username }}
{{- else }}
{{- .Values.externalDatabase.username }}
{{- end }}
{{- end }}

{{/*
Return MySQL secret name
*/}}
{{- define "feastfrenzy.mysql.secretName" -}}
{{- if .Values.mysql.enabled }}
{{- if .Values.mysql.auth.existingSecret }}
{{- .Values.mysql.auth.existingSecret }}
{{- else }}
{{- printf "%s-mysql" (include "feastfrenzy.fullname" .) }}
{{- end }}
{{- else if .Values.externalDatabase.existingSecret }}
{{- .Values.externalDatabase.existingSecret }}
{{- else }}
{{- printf "%s-external-db" (include "feastfrenzy.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Return Redis host
*/}}
{{- define "feastfrenzy.redis.host" -}}
{{- if .Values.redis.enabled }}
{{- printf "%s-redis-master" (include "feastfrenzy.fullname" .) }}
{{- else }}
{{- .Values.externalRedis.host }}
{{- end }}
{{- end }}

{{/*
Return Redis port
*/}}
{{- define "feastfrenzy.redis.port" -}}
{{- if .Values.redis.enabled }}
{{- printf "6379" }}
{{- else }}
{{- .Values.externalRedis.port | toString }}
{{- end }}
{{- end }}

{{/*
Return Redis secret name
*/}}
{{- define "feastfrenzy.redis.secretName" -}}
{{- if .Values.redis.enabled }}
{{- if .Values.redis.auth.existingSecret }}
{{- .Values.redis.auth.existingSecret }}
{{- else }}
{{- printf "%s-redis" (include "feastfrenzy.fullname" .) }}
{{- end }}
{{- else if .Values.externalRedis.existingSecret }}
{{- .Values.externalRedis.existingSecret }}
{{- else }}
{{- printf "%s-external-redis" (include "feastfrenzy.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Return JWT secret name
*/}}
{{- define "feastfrenzy.jwt.secretName" -}}
{{- if .Values.secrets.jwt.existingSecret }}
{{- .Values.secrets.jwt.existingSecret }}
{{- else }}
{{- printf "%s-jwt" (include "feastfrenzy.fullname" .) }}
{{- end }}
{{- end }}
