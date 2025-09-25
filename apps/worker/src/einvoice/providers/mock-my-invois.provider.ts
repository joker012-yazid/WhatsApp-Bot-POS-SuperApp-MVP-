import { randomUUID } from 'crypto';
import { EinvoiceSubmissionStatus } from '@prisma/client';
import {
  EinvoiceProviderAdapter,
  EinvoiceProviderOptions,
  EinvoicePayload,
  EinvoiceStatusResult,
  EinvoiceSubmitResult
} from '../provider';

type SubmissionState = {
  polls: number;
  finalStatus: EinvoiceSubmissionStatus;
};

const submissions = new Map<string, SubmissionState>();

export class MockMyInvoisProvider implements EinvoiceProviderAdapter {
  constructor(private readonly options: EinvoiceProviderOptions = {}) {}

  async submit(payload: EinvoicePayload): Promise<EinvoiceSubmitResult> {
    const submissionId = `MOCK-${randomUUID()}`;
    const finalStatus =
      payload.invoice.grandTotal <= 0
        ? EinvoiceSubmissionStatus.REJECTED
        : EinvoiceSubmissionStatus.ACCEPTED;

    submissions.set(submissionId, { polls: 0, finalStatus });

    const initialStatus =
      finalStatus === EinvoiceSubmissionStatus.REJECTED
        ? EinvoiceSubmissionStatus.REJECTED
        : EinvoiceSubmissionStatus.PENDING;

    return {
      submissionId,
      status: initialStatus,
      raw: {
        provider: 'MockMyInvois',
        endpoint: this.options.endpoint ?? 'mock://einvoice',
        environment: this.options.environment ?? 'sandbox',
        payloadSummary: {
          invoiceNo: payload.invoice.invoiceNo,
          grandTotal: payload.invoice.grandTotal,
          currency: payload.invoice.currency,
          items: payload.items.length
        }
      },
      message:
        finalStatus === EinvoiceSubmissionStatus.REJECTED
          ? 'Mock validation failed: invoice total must be positive.'
          : 'Mock submission accepted for processing.'
    };
  }

  async status(submissionId: string): Promise<EinvoiceStatusResult> {
    const state = submissions.get(submissionId);
    if (!state) {
      return {
        status: EinvoiceSubmissionStatus.FAILED,
        raw: { submissionId, message: 'Submission not found.' },
        message: 'Submission not found.'
      };
    }

    if (state.finalStatus === EinvoiceSubmissionStatus.REJECTED) {
      submissions.delete(submissionId);
      return {
        status: EinvoiceSubmissionStatus.REJECTED,
        raw: { submissionId, message: 'Mock validation failed.' },
        message: 'Mock validation failed.'
      };
    }

    state.polls += 1;

    if (state.polls >= 2) {
      submissions.delete(submissionId);
      return {
        status: EinvoiceSubmissionStatus.ACCEPTED,
        raw: { submissionId, message: 'Mock invoice accepted.' },
        message: 'Mock invoice accepted.'
      };
    }

    submissions.set(submissionId, state);

    return {
      status: EinvoiceSubmissionStatus.SENT,
      raw: { submissionId, message: 'Mock invoice processing.', polls: state.polls },
      message: 'Mock invoice processing.'
    };
  }
}
