// lib/exports/export-strategy.ts

export type ExportFormat =
  // Regular suite formats
  | "gherkin"
  | "cucumber"
  | "testrail"
  | "jira"
  | "json"
  | "markdown"
  // API formats
  | "postman"
  | "karate"
  | "openapi"
  | "insomnia"
  // Web formats
  | "selenium"
  | "playwright"
  | "cypress"
  | "webdriverio"
  // Mobile formats
  | "appium"
  | "maestro"
  | "xcuitest"
  | "espresso"
  // Performance formats
  | "jmeter"
  | "k6"
  | "gatling"
  | "locust"
  // Accessibility formats
  | "axe"
  | "pa11y"
  | "wave-config";

export type PlatformType =
  | "web"
  | "mobile"
  | "api"
  | "accessibility"
  | "performance";

export interface ExportOption {
  format: ExportFormat;
  label: string;
  icon: string;
  description: string;
  fileExtension: string;
  mimeType: string;
}

export const PLATFORM_EXPORT_OPTIONS: Record<PlatformType, ExportOption[]> = {
  api: [
    {
      format: "postman",
      label: "Postman Collection",
      icon: "FileJson",
      description: "Import into Postman",
      fileExtension: "json",
      mimeType: "application/json",
    },
    {
      format: "karate",
      label: "Karate Feature",
      icon: "FileCode",
      description: "BDD test automation",
      fileExtension: "feature",
      mimeType: "text/plain",
    },
    {
      format: "openapi",
      label: "OpenAPI Spec",
      icon: "FileJson",
      description: "OpenAPI 3.0 schema",
      fileExtension: "yaml",
      mimeType: "text/yaml",
    },
    {
      format: "insomnia",
      label: "Insomnia Collection",
      icon: "FileJson",
      description: "Import into Insomnia",
      fileExtension: "json",
      mimeType: "application/json",
    },
  ],
  web: [
    {
      format: "selenium",
      label: "Selenium (Python)",
      icon: "FileCode",
      description: "Python unittest format",
      fileExtension: "py",
      mimeType: "text/x-python",
    },
    {
      format: "playwright",
      label: "Playwright (TypeScript)",
      icon: "FileCode",
      description: "Playwright test scripts",
      fileExtension: "spec.ts",
      mimeType: "text/typescript",
    },
    {
      format: "cypress",
      label: "Cypress",
      icon: "FileCode",
      description: "Cypress test specs",
      fileExtension: "cy.js",
      mimeType: "text/javascript",
    },
  ],
  mobile: [
    {
      format: "appium",
      label: "Appium (Python)",
      icon: "FileCode",
      description: "Cross-platform mobile automation",
      fileExtension: "py",
      mimeType: "text/x-python",
    },
    {
      format: "maestro",
      label: "Maestro Flow",
      icon: "FileCode",
      description: "Simple mobile UI testing",
      fileExtension: "yaml",
      mimeType: "text/yaml",
    },
    {
      format: "xcuitest",
      label: "XCUITest (iOS)",
      icon: "FileCode",
      description: "Native iOS testing",
      fileExtension: "swift",
      mimeType: "text/x-swift",
    },
    {
      format: "espresso",
      label: "Espresso (Android)",
      icon: "FileCode",
      description: "Native Android testing",
      fileExtension: "kt",
      mimeType: "text/x-kotlin",
    },
  ],
  performance: [
    {
      format: "jmeter",
      label: "JMeter",
      icon: "FileCode",
      description: "JMeter test plan",
      fileExtension: "jmx",
      mimeType: "application/xml",
    },
    {
      format: "k6",
      label: "k6 Script",
      icon: "FileCode",
      description: "k6 load testing",
      fileExtension: "js",
      mimeType: "text/javascript",
    },
    {
      format: "gatling",
      label: "Gatling",
      icon: "FileCode",
      description: "Gatling Scala script",
      fileExtension: "scala",
      mimeType: "text/x-scala",
    },
    {
      format: "locust",
      label: "Locust",
      icon: "FileCode",
      description: "Python-based load testing",
      fileExtension: "py",
      mimeType: "text/x-python",
    },
  ],
  accessibility: [
    {
      format: "axe",
      label: "Axe DevTools",
      icon: "FileJson",
      description: "Automated accessibility testing",
      fileExtension: "json",
      mimeType: "application/json",
    },
    {
      format: "pa11y",
      label: "Pa11y Config",
      icon: "FileJson",
      description: "Accessibility CI testing",
      fileExtension: "json",
      mimeType: "application/json",
    },
    {
      format: "wave-config",
      label: "WAVE Config",
      icon: "FileJson",
      description: "WAVE API configuration",
      fileExtension: "json",
      mimeType: "application/json",
    },
  ],
};

export const REGULAR_SUITE_FORMATS: ExportOption[] = [
  {
    format: "gherkin",
    label: "Gherkin/BDD",
    icon: "FileText",
    description: "BDD scenarios",
    fileExtension: "feature",
    mimeType: "text/plain",
  },
  {
    format: "cucumber",
    label: "Cucumber Feature",
    icon: "FileCode",
    description: "Full Cucumber feature",
    fileExtension: "feature",
    mimeType: "text/plain",
  },
  {
    format: "testrail",
    label: "TestRail XML",
    icon: "FileCode",
    description: "Import into TestRail",
    fileExtension: "xml",
    mimeType: "application/xml",
  },
  {
    format: "jira",
    label: "Jira CSV",
    icon: "FileSpreadsheet",
    description: "Import into Jira",
    fileExtension: "csv",
    mimeType: "text/csv",
  },
  {
    format: "json",
    label: "JSON",
    icon: "FileJson",
    description: "Raw JSON export",
    fileExtension: "json",
    mimeType: "application/json",
  },
  {
    format: "markdown",
    label: "Markdown",
    icon: "FileText",
    description: "Documentation format",
    fileExtension: "md",
    mimeType: "text/markdown",
  },
];
