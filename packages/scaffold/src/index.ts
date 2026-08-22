export {
  collectAnswers,
  parsePresetAnswer,
  type CollectAnswersOptions,
  type Questionnaire,
} from './answers.js';

export {
  runActions,
  type RunActionsOptions,
  type RunActionsResult,
} from './actions.js';

export {
  writePlan,
  type WriteMode,
  type WritePlanOptions,
  type WriteResult,
} from './apply.js';

export {
  CATALOG_FILE_NAME,
  loadCatalog,
  requireLayer,
  requireLayers,
  requireScaffold,
  resolveCatalog,
  resolveScaffoldSource,
  type CatalogEntry,
  type ResolvedCatalog,
  type ScaffoldSource,
} from './catalog.js';

export {
  mergeIntoExisting,
  planLayers,
  planProject,
  resolveLayers,
  type PlannedFile,
} from './plan.js';

export {
  flattenAnswers,
  resolveScopedAnswers,
  variablesForLayer,
  type ResolveScopedAnswersOptions,
  type ScopedAnswers,
} from './scope.js';

export {
  sha256,
  syncPlan,
  type ManagedFileState,
  type SyncPlanOptions,
  type SyncResult,
} from './sync.js';

export {
  prepareProject,
  type PreparedProject,
  type PrepareProjectOptions,
} from './run.js';

export {
  askQuestion,
  defaultAnswer,
  isInteractive,
  skippedAnswer,
  validateAnswer,
  type AnswerValue,
} from './prompt.js';

export {
  catalogSchema,
  layerSchema,
  parseCatalog,
  scaffoldSchema,
  type ProjectScaffold,
  type ScaffoldAction,
  type ScaffoldCatalog,
  type ScaffoldChoice,
  type ScaffoldFileRule,
  type ScaffoldLayer,
  type ScaffoldQuestion,
} from './schema.js';

export {
  evaluateCondition,
  renderTemplate,
  type TemplateValue,
  type TemplateVariables,
} from './template.js';
