// Build mode API calls. Projects live on the backend in workspace-projects/<id>/.
import { apiRequest } from './apiClient'

export const listProjects = () => apiRequest('/api/projects').then((d) => d.projects)

export const getProject = (id) => apiRequest(`/api/projects/${encodeURIComponent(id)}`).then((d) => d.project)

export const createProject = ({ name, task, brief, mode }) =>
  apiRequest('/api/projects', { method: 'POST', body: { name, task, brief, mode } }).then((d) => d.project)

export const listFiles = (id) => apiRequest(`/api/projects/${encodeURIComponent(id)}/files`).then((d) => d.files)

export const readFile = (id, path) => apiRequest(`/api/projects/${encodeURIComponent(id)}/file?path=${encodeURIComponent(path)}`)

export const runProject = (id) => apiRequest(`/api/projects/${encodeURIComponent(id)}/run`, { method: 'POST', timeoutMs: 40000 }).then((d) => d.preview)

export const stopProject = (id) => apiRequest(`/api/projects/${encodeURIComponent(id)}/stop`, { method: 'POST' })

export const retryProject = (id, mode) => apiRequest(`/api/projects/${encodeURIComponent(id)}/retry`, { method: 'POST', body: { mode } }).then((d) => d.project)

export const decideApproval = (id, approvalId, decision, note = '') =>
  apiRequest(`/api/projects/${encodeURIComponent(id)}/approvals/${encodeURIComponent(approvalId)}`, { method: 'POST', body: { decision, note } }).then((d) => d.project)

export const deleteProject = (id) => apiRequest(`/api/projects/${encodeURIComponent(id)}?confirm=${encodeURIComponent(id)}`, { method: 'DELETE' })

// Labels shared by the Projects pages.
export const PROJECT_STATUS = {
  queued: { label: 'Queued', tone: 'pending' },
  building: { label: 'Building', tone: 'active' },
  reviewing: { label: 'Reviewing', tone: 'active' },
  complete: { label: 'Complete', tone: 'ok' },
  'review-required': { label: 'Review required', tone: 'warn' },
  failed: { label: 'Failed', tone: 'error' },
}

export const BUILD_STATUS = {
  pending: 'Not built yet',
  installing: 'Installing dependencies',
  building: 'Building',
  passed: 'Passed',
  failed: 'Failed',
}

export const isProjectActive = (project) => ['queued', 'building', 'reviewing'].includes(project?.status)
