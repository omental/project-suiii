import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "backend/.venv/**",
      "backend/.pip-tmp/**",
      "backend/.pip-cache/**",
      "backend/.pytest_cache/**",
      "backend/.ruff_cache/**",
      "pytest-cache-files-*/**",
      "backend/pytest-cache-files-*/**",
      "backend/private_uploads/**"
    ]
  }
];

export default eslintConfig;
