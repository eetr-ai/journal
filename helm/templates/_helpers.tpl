{{/* Release-scoped base name, truncated to the 63 characters a label allows.
     A release already named after the chart is not repeated: `helm install
     journal` gives journal-web, not journal-journal-web. */}}
{{- define "journal.fullname" -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "journal.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
{{- end -}}

{{/* A strict subset of the above, with version left out: a Deployment selector
     is immutable, so a label that changes per release breaks every upgrade. */}}
{{- define "journal.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/* Where the database URL comes from: a secret you created, or one this chart
     renders from values. Named once so every reference agrees. */}}
{{- define "journal.postgresSecretName" -}}
{{- .Values.postgres.existingSecret | default (printf "%s-postgres" (include "journal.fullname" .)) -}}
{{- end -}}

{{- define "journal.authSecretName" -}}
{{- .Values.auth.existingSecret | default (printf "%s-auth" (include "journal.fullname" .)) -}}
{{- end -}}
