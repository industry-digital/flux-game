import { EasingFunctionName } from '~/types/easing';
import { WellKnownDuration } from '~/types/world/time';

export type WeatherPropertySpecificationInput = {
  /**
   * The baseline value of the property
   */
  baseline: number;

  /**
   * The amplitude of the property
   */
  amplitude: number;
};

export type WeatherPropertySpecification = WeatherPropertySpecificationInput & {
  /**
   * The period of the oscillation; defaults to 24 hours
   * 24 hours = 86400000ms
   */
  period?: [number, WellKnownDuration];

  /**
   * Easing equation for the oscillation; defaults to the `sine` trigonometric function.
   */
  curve?: EasingFunctionName;
}

export type CurvePositionValue = {
  /**
   * The position `t` on an easing curve. Normalized to [0, 1]
   */
  position: number;

  /**
   * The computed value of the property at the position `t` on the curve
   */
  value: number;
};

export type Weather = {
  /**
   * The seed value for the weather generator
   */
  seed: number;

  /**
   * The temperature value in Celsius and the position `t` on the temperature curve
   */
  temperature: CurvePositionValue;

  /**
   * The pressure value in hectopascals (hPa) and the position `t` on the pressure curve
   */
  pressure: CurvePositionValue;

  /**
   * The humidity value as a percentage (0-100) and the position `t` on the humidity curve
   */
  humidity: CurvePositionValue;

  // DERIVED OUTPUTS (computed from inputs)
  /**
   * Instantaneous precipitation rate, expressed as `mm/hour`
   * Computed from temperature, pressure, and humidity
   */
  precipitation: number;

  /**
   * Photosynthetic Photon Flux Density in `μmol photons m⁻² s⁻¹`
   * Computed from cloud cover and solar geometry (angle of the sun)
   */
  ppfd: number;

  /**
   * Cloud coverage as a percentage (0-100)
   * Computed from humidity, pressure, and temperature
   */
  clouds: number;

  /**
   * This is a normalized value between 0 and 1 that represents the intensity of fog.
   * 0 = no fog, 1 = dense fog.
   * Computed from temperature-dewpoint spread and cloud cover.
   */
  fog: number;

  // METADATA
  /**
   * The last time the weather was updated, in milliseconds since the Unix epoch
   */
  ts: number;
};
