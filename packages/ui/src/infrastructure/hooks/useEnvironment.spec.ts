import { describe, it, expect } from 'vitest';
import { createEnvironmentHook } from './useEnvironment';
import type { EnvironmentLike, EnvironmentConfig } from '~/types/infrastructure';

describe('createEnvironmentHook', () => {
  describe('basic functionality', () => {
    it('should create a hook that returns resolved environment values', () => {
      const mockEnv: EnvironmentLike = {
        'VITE_APP_NAME': 'test-app',
        'VITE_API_URL': 'https://api.test.com',
      };

      type TestEnvironment = {
        appName: string;
        apiUrl: string;
      };

      const config: EnvironmentConfig<TestEnvironment> = {
        appName: { key: 'VITE_APP_NAME', required: true },
        apiUrl: { key: 'VITE_API_URL', required: true },
      };

      const useTestEnvironment = createEnvironmentHook(mockEnv, config);
      const environment = useTestEnvironment();

      expect(environment).toEqual({
        appName: 'test-app',
        apiUrl: 'https://api.test.com',
      });
    });

    it('should return the same object reference on multiple calls', () => {
      const mockEnv: EnvironmentLike = {
        'VITE_APP_NAME': 'test-app',
      };

      type TestEnvironment = {
        appName: string;
      };

      const config: EnvironmentConfig<TestEnvironment> = {
        appName: { key: 'VITE_APP_NAME', required: true },
      };

      const useTestEnvironment = createEnvironmentHook(mockEnv, config);
      const env1 = useTestEnvironment();
      const env2 = useTestEnvironment();

      expect(env1).toBe(env2);
    });
  });

  describe('required field validation', () => {
    it('should throw an error when a required field is missing', () => {
      const mockEnv: EnvironmentLike = {
        'VITE_OPTIONAL_VAR': 'present',
      };

      type TestEnvironment = {
        requiredVar: string;
        optionalVar: string;
      };

      const config: EnvironmentConfig<TestEnvironment> = {
        requiredVar: { key: 'VITE_REQUIRED_VAR', required: true },
        optionalVar: { key: 'VITE_OPTIONAL_VAR' },
      };

      expect(() => {
        createEnvironmentHook(mockEnv, config);
      }).toThrow(/VITE_REQUIRED_VAR/);
    });

    it('should throw an error listing all missing required fields', () => {
      const mockEnv: EnvironmentLike = {
        'VITE_PRESENT_VAR': 'present',
      };

      type TestEnvironment = {
        requiredVar1: string;
        requiredVar2: string;
        requiredVar3: string;
        presentVar: string;
      };

      const config: EnvironmentConfig<TestEnvironment> = {
        requiredVar1: { key: 'VITE_MISSING_VAR_1', required: true },
        requiredVar2: { key: 'VITE_MISSING_VAR_2', required: true },
        requiredVar3: { key: 'VITE_MISSING_VAR_3', required: true },
        presentVar: { key: 'VITE_PRESENT_VAR', required: true },
      };

      const errorCall = () => createEnvironmentHook(mockEnv, config);

      expect(errorCall).toThrow();

      // Verify all missing variables are mentioned in the error message
      try {
        errorCall();
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toMatch(/VITE_MISSING_VAR_1/);
        expect(message).toMatch(/VITE_MISSING_VAR_2/);
        expect(message).toMatch(/VITE_MISSING_VAR_3/);
        // Verify the present variable is NOT in the error message
        expect(message).not.toMatch(/VITE_PRESENT_VAR/);
      }
    });

    it('should not throw when all required fields are present', () => {
      const mockEnv: EnvironmentLike = {
        'VITE_REQUIRED_VAR': 'present',
      };

      type TestEnvironment = {
        requiredVar: string;
      };

      const config: EnvironmentConfig<TestEnvironment> = {
        requiredVar: { key: 'VITE_REQUIRED_VAR', required: true },
      };

      expect(() => {
        createEnvironmentHook(mockEnv, config);
      }).not.toThrow();
    });

    it('should allow undefined values for non-required fields', () => {
      const mockEnv: EnvironmentLike = {};

      type TestEnvironment = {
        optionalVar: string | undefined;
      };

      const config: EnvironmentConfig<TestEnvironment> = {
        optionalVar: { key: 'VITE_OPTIONAL_VAR' },
      };

      const useTestEnvironment = createEnvironmentHook(mockEnv, config);
      const environment = useTestEnvironment();

      expect(environment.optionalVar).toBeUndefined();
    });
  });

  describe('default values', () => {
    it('should use default values when environment variable is missing', () => {
      const mockEnv: EnvironmentLike = {};

      type TestEnvironment = {
        varWithDefault: string;
        numberWithDefault: number;
        booleanWithDefault: boolean;
      };

      const config: EnvironmentConfig<TestEnvironment> = {
        varWithDefault: { key: 'VITE_MISSING_VAR', defaultValue: 'default-value' },
        numberWithDefault: { key: 'VITE_MISSING_NUMBER', defaultValue: 42 },
        booleanWithDefault: { key: 'VITE_MISSING_BOOLEAN', defaultValue: true },
      };

      const useTestEnvironment = createEnvironmentHook(mockEnv, config);
      const environment = useTestEnvironment();

      expect(environment).toEqual({
        varWithDefault: 'default-value',
        numberWithDefault: 42,
        booleanWithDefault: true,
      });
    });

    it('should prefer environment values over defaults when present', () => {
      const mockEnv: EnvironmentLike = {
        'VITE_VAR_WITH_DEFAULT': 'env-value',
      };

      type TestEnvironment = {
        varWithDefault: string;
      };

      const config: EnvironmentConfig<TestEnvironment> = {
        varWithDefault: { key: 'VITE_VAR_WITH_DEFAULT', defaultValue: 'default-value' },
      };

      const useTestEnvironment = createEnvironmentHook(mockEnv, config);
      const environment = useTestEnvironment();

      expect(environment.varWithDefault).toBe('env-value');
    });

    it('should not throw for required fields that have default values', () => {
      const mockEnv: EnvironmentLike = {};

      type TestEnvironment = {
        requiredWithDefault: string;
      };

      const config: EnvironmentConfig<TestEnvironment> = {
        requiredWithDefault: {
          key: 'VITE_MISSING_VAR',
          required: true,
          defaultValue: 'default-value'
        },
      };

      expect(() => {
        createEnvironmentHook(mockEnv, config);
      }).not.toThrow();

      const useTestEnvironment = createEnvironmentHook(mockEnv, config);
      const environment = useTestEnvironment();

      expect(environment.requiredWithDefault).toBe('default-value');
    });
  });

  describe('value transformations', () => {
    it('should transform string values to booleans', () => {
      const mockEnv: EnvironmentLike = {
        'VITE_BOOL_TRUE': 'true',
        'VITE_BOOL_FALSE': 'false',
        'VITE_BOOL_TRUTHY': 'TRUE',
        'VITE_BOOL_FALSY': 'anything-else',
      };

      type TestEnvironment = {
        boolTrue: boolean;
        boolFalse: boolean;
        boolTruthy: boolean;
        boolFalsy: boolean;
      };

      const config: EnvironmentConfig<TestEnvironment> = {
        boolTrue: {
          key: 'VITE_BOOL_TRUE',
          transform: (value: string) => value.toLowerCase() === 'true'
        },
        boolFalse: {
          key: 'VITE_BOOL_FALSE',
          transform: (value: string) => value.toLowerCase() === 'true'
        },
        boolTruthy: {
          key: 'VITE_BOOL_TRUTHY',
          transform: (value: string) => value.toLowerCase() === 'true'
        },
        boolFalsy: {
          key: 'VITE_BOOL_FALSY',
          transform: (value: string) => value.toLowerCase() === 'true'
        },
      };

      const useTestEnvironment = createEnvironmentHook(mockEnv, config);
      const environment = useTestEnvironment();

      expect(environment).toEqual({
        boolTrue: true,
        boolFalse: false,
        boolTruthy: true, // 'TRUE'.toLowerCase() === 'true'
        boolFalsy: false,
      });
    });

    it('should transform string values to numbers', () => {
      const mockEnv: EnvironmentLike = {
        'VITE_PORT': '3000',
        'VITE_TIMEOUT': '5000',
        'VITE_INVALID_NUMBER': 'not-a-number',
      };

      type TestEnvironment = {
        port: number;
        timeout: number;
        invalidNumber: number;
      };

      const config: EnvironmentConfig<TestEnvironment> = {
        port: {
          key: 'VITE_PORT',
          transform: (value: string) => parseInt(value, 10)
        },
        timeout: {
          key: 'VITE_TIMEOUT',
          transform: (value: string) => parseInt(value, 10)
        },
        invalidNumber: {
          key: 'VITE_INVALID_NUMBER',
          transform: (value: string) => parseInt(value, 10)
        },
      };

      const useTestEnvironment = createEnvironmentHook(mockEnv, config);
      const environment = useTestEnvironment();

      expect(environment.port).toBe(3000);
      expect(environment.timeout).toBe(5000);
      expect(environment.invalidNumber).toBeNaN();
    });

    it('should handle complex transformations', () => {
      const mockEnv: EnvironmentLike = {
        'VITE_COMMA_SEPARATED': 'item1,item2,item3',
        'VITE_JSON_CONFIG': '{"key": "value", "number": 42}',
      };

      type TestEnvironment = {
        items: string[];
        config: { key: string; number: number };
      };

      const config: EnvironmentConfig<TestEnvironment> = {
        items: {
          key: 'VITE_COMMA_SEPARATED',
          transform: (value: string) => value.split(',').map(item => item.trim())
        },
        config: {
          key: 'VITE_JSON_CONFIG',
          transform: (value: string) => JSON.parse(value)
        },
      };

      const useTestEnvironment = createEnvironmentHook(mockEnv, config);
      const environment = useTestEnvironment();

      expect(environment.items).toEqual(['item1', 'item2', 'item3']);
      expect(environment.config).toEqual({ key: 'value', number: 42 });
    });

    it('should not transform values when no transform function is provided', () => {
      const mockEnv: EnvironmentLike = {
        'VITE_RAW_VALUE': 'raw-string-value',
      };

      type TestEnvironment = {
        rawValue: string;
      };

      const config: EnvironmentConfig<TestEnvironment> = {
        rawValue: { key: 'VITE_RAW_VALUE' },
      };

      const useTestEnvironment = createEnvironmentHook(mockEnv, config);
      const environment = useTestEnvironment();

      expect(environment.rawValue).toBe('raw-string-value');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty environment object', () => {
      const mockEnv: EnvironmentLike = {};

      type TestEnvironment = {
        optionalVar: string | undefined;
      };

      const config: EnvironmentConfig<TestEnvironment> = {
        optionalVar: { key: 'VITE_MISSING_VAR' },
      };

      const useTestEnvironment = createEnvironmentHook(mockEnv, config);
      const environment = useTestEnvironment();

      expect(environment.optionalVar).toBeUndefined();
    });

    it('should handle empty configuration object', () => {
      const mockEnv: EnvironmentLike = {
        'VITE_UNUSED_VAR': 'unused',
      };

      type TestEnvironment = Record<string, never>;

      const config: EnvironmentConfig<TestEnvironment> = {};

      const useTestEnvironment = createEnvironmentHook(mockEnv, config);
      const environment = useTestEnvironment();

      expect(environment).toEqual({});
    });

    it('should handle transformation errors gracefully', () => {
      const mockEnv: EnvironmentLike = {
        'VITE_INVALID_JSON': 'invalid-json-string',
      };

      type TestEnvironment = {
        config: any;
      };

      const config: EnvironmentConfig<TestEnvironment> = {
        config: {
          key: 'VITE_INVALID_JSON',
          transform: (value: string) => JSON.parse(value)
        },
      };

      expect(() => {
        createEnvironmentHook(mockEnv, config);
      }).toThrow(); // JSON.parse will throw
    });

    it('should preserve type safety with complex nested types', () => {
      const mockEnv: EnvironmentLike = {
        'VITE_FEATURE_FLAGS': 'feature1,feature2',
        'VITE_API_CONFIG': '{"baseUrl": "https://api.com", "timeout": 5000}',
      };

      type ApiConfig = {
        baseUrl: string;
        timeout: number;
      };

      type TestEnvironment = {
        features: string[];
        apiConfig: ApiConfig;
        optionalString?: string;
      };

      const config: EnvironmentConfig<TestEnvironment> = {
        features: {
          key: 'VITE_FEATURE_FLAGS',
          transform: (value: string) => value.split(',')
        },
        apiConfig: {
          key: 'VITE_API_CONFIG',
          transform: (value: string) => JSON.parse(value) as ApiConfig
        },
        optionalString: { key: 'VITE_MISSING_OPTIONAL' },
      };

      const useTestEnvironment = createEnvironmentHook(mockEnv, config);
      const environment = useTestEnvironment();

      // TypeScript should infer the correct types
      expect(Array.isArray(environment.features)).toBe(true);
      expect(typeof environment.apiConfig.baseUrl).toBe('string');
      expect(typeof environment.apiConfig.timeout).toBe('number');
      expect(environment.optionalString).toBeUndefined();
    });
  });
});
