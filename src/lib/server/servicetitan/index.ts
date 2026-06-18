export {
  getServiceTitanConfig,
  isServiceTitanConfigured,
  type ServiceTitanConfig
} from './config';
export { ServiceTitanError } from './client';
export { submitIntakeToServiceTitan, type IntakeSubmissionResult, type BookingFeeContext } from './intakeMapper';
export { findReturningCustomer, type ReturningCustomerMatch } from './customerLookup';
