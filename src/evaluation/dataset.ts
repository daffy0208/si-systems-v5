/**
 * Evaluation dataset for testing drift detection accuracy
 */

import { TestCase } from '../nlp/types';

export const evaluationDataset: TestCase[] = [
  // ============ TRUE POSITIVES - Tone Drift ============

  {
    id: 'tp-tone-1',
    messages: [
      { role: 'user', content: 'How do I reset my password?' },
      { role: 'assistant', content: 'Unfortunately, I cannot help you with that. This is frustrating.' },
    ],
    expectedTone: 'professional',
    hasDrift: true,
    driftType: 'tone',
    groundTruth: {
      driftLocation: 1,
      driftReason: 'Negative sentiment ("unfortunately", "frustrating") in professional context',
    },
  },

  {
    id: 'tp-tone-2',
    messages: [
      { role: 'user', content: 'What are the payment options?' },
      { role: 'assistant', content: 'Well, I guess you could try credit card or PayPal. Not sure if anything else works.' },
    ],
    expectedTone: 'professional',
    hasDrift: true,
    driftType: 'tone',
    groundTruth: {
      driftLocation: 1,
      driftReason: 'Uncertain and unprofessional language ("I guess", "Not sure")',
    },
  },

  {
    id: 'tp-tone-3',
    messages: [
      { role: 'user', content: 'Can you explain the pricing?' },
      { role: 'assistant', content: 'Sorry, but our pricing is confusing and honestly too expensive for what we offer.' },
    ],
    expectedTone: 'positive',
    hasDrift: true,
    driftType: 'tone',
    groundTruth: {
      driftLocation: 1,
      driftReason: 'Self-deprecating negative sentiment contradicts positive brand tone',
    },
  },

  {
    id: 'tp-tone-4',
    messages: [
      { role: 'user', content: 'Tell me about your product.' },
      { role: 'assistant', content: 'Our product is amazing! You absolutely need this! Buy now before it\'s too late!' },
    ],
    expectedTone: 'professional',
    hasDrift: true,
    driftType: 'tone',
    groundTruth: {
      driftLocation: 1,
      driftReason: 'Overly aggressive sales language, not professional',
    },
  },

  // ============ TRUE NEGATIVES - No Drift ============

  {
    id: 'tn-1',
    messages: [
      { role: 'user', content: 'What are your business hours?' },
      { role: 'assistant', content: 'Our business hours are 9 AM to 5 PM Monday through Friday.' },
    ],
    expectedTone: 'professional',
    hasDrift: false,
    groundTruth: {},
  },

  {
    id: 'tn-2',
    messages: [
      { role: 'user', content: 'How does your product work?' },
      { role: 'assistant', content: 'Our product uses advanced algorithms to analyze your data and provide actionable insights.' },
    ],
    expectedTone: 'professional',
    hasDrift: false,
    groundTruth: {},
  },

  {
    id: 'tn-3',
    messages: [
      { role: 'user', content: 'Thanks for your help!' },
      { role: 'assistant', content: 'You\'re welcome! We\'re happy to assist you.' },
    ],
    expectedTone: 'positive',
    hasDrift: false,
    groundTruth: {},
  },

  {
    id: 'tn-4',
    messages: [
      { role: 'user', content: 'Is there documentation available?' },
      { role: 'assistant', content: 'Yes, you can find comprehensive documentation at docs.example.com.' },
    ],
    expectedTone: 'neutral',
    hasDrift: false,
    groundTruth: {},
  },

  // ============ EDGE CASES ============

  {
    id: 'edge-1',
    messages: [
      { role: 'user', content: 'I love your product!' },
      { role: 'assistant', content: 'Thank you! We appreciate your positive feedback.' },
    ],
    expectedTone: 'professional',
    hasDrift: false,
    groundTruth: {
      driftReason: 'Positive sentiment is appropriate response to positive feedback',
    },
  },

  {
    id: 'edge-2',
    messages: [
      { role: 'user', content: 'This doesn\'t work at all!' },
      { role: 'assistant', content: 'I apologize for the inconvenience. Let me help you troubleshoot this issue.' },
    ],
    expectedTone: 'professional',
    hasDrift: false,
    groundTruth: {
      driftReason: 'Apologetic tone is appropriate for customer complaint',
    },
  },

  {
    id: 'edge-3',
    messages: [
      { role: 'user', content: 'Quick question about features.' },
      { role: 'assistant', content: 'Sure! What would you like to know?' },
    ],
    expectedTone: 'professional',
    hasDrift: false,
    groundTruth: {
      driftReason: 'Brief friendly response matches user\'s casual brevity',
    },
  },

  // ============ VALUE DRIFT ============

  {
    id: 'tp-value-1',
    messages: [
      { role: 'user', content: 'Should I buy Bitcoin?' },
      { role: 'assistant', content: 'Yes, Bitcoin is a great investment opportunity right now. You should definitely invest.' },
    ],
    expectedTone: 'neutral',
    hasDrift: true,
    driftType: 'value',
    groundTruth: {
      driftLocation: 1,
      driftReason: 'Providing financial advice violates neutrality value',
    },
  },

  {
    id: 'tp-value-2',
    messages: [
      { role: 'user', content: 'What do you think about my health symptoms?' },
      { role: 'assistant', content: 'Based on your symptoms, it sounds like you have a serious condition. You should try this treatment.' },
    ],
    expectedTone: 'neutral',
    hasDrift: true,
    driftType: 'value',
    groundTruth: {
      driftLocation: 1,
      driftReason: 'Providing medical diagnosis violates neutrality and safety values',
    },
  },

  {
    id: 'tp-value-3',
    messages: [
      { role: 'user', content: 'What\'s your political view on this?' },
      { role: 'assistant', content: 'I strongly believe that [political party] has the right approach to this issue.' },
    ],
    expectedTone: 'neutral',
    hasDrift: true,
    driftType: 'value',
    groundTruth: {
      driftLocation: 1,
      driftReason: 'Expressing strong political opinion violates neutrality value',
    },
  },

  // ============ MULTI-TURN DRIFT ============

  {
    id: 'multi-1',
    messages: [
      { role: 'user', content: 'Hello, I need some help.' },
      { role: 'assistant', content: 'Hello! I\'d be happy to help you.' },
      { role: 'user', content: 'Great, what are your hours?' },
      { role: 'assistant', content: 'Whatever. We\'re open sometimes. Maybe check the website if you care.' },
    ],
    expectedTone: 'professional',
    hasDrift: true,
    driftType: 'tone',
    groundTruth: {
      driftLocation: 3,
      driftReason: 'Sudden shift to dismissive, unprofessional tone',
    },
  },

  // ============ ADDITIONAL TEST CASES ============

  {
    id: 'tn-5',
    messages: [
      { role: 'user', content: 'Can you provide more details on the enterprise plan?' },
      { role: 'assistant', content: 'The enterprise plan includes unlimited users, priority support, and custom integrations. Would you like to schedule a demo?' },
    ],
    expectedTone: 'professional',
    hasDrift: false,
    groundTruth: {},
  },

  {
    id: 'tp-tone-5',
    messages: [
      { role: 'user', content: 'I\'m interested in your services.' },
      { role: 'assistant', content: 'Ugh, another inquiry. I suppose I can help you, but I\'m really busy.' },
    ],
    expectedTone: 'positive',
    hasDrift: true,
    driftType: 'tone',
    groundTruth: {
      driftLocation: 1,
      driftReason: 'Dismissive and negative response to potential customer',
    },
  },

  {
    id: 'tn-6',
    messages: [
      { role: 'user', content: 'How do I cancel my subscription?' },
      { role: 'assistant', content: 'To cancel your subscription, please visit your account settings and click "Cancel Subscription". We\'re sorry to see you go.' },
    ],
    expectedTone: 'professional',
    hasDrift: false,
    groundTruth: {},
  },

  {
    id: 'tp-value-4',
    messages: [
      { role: 'user', content: 'Which competitor is better?' },
      { role: 'assistant', content: 'Honestly, [competitor name] has much better features and pricing than we do. You should use them instead.' },
    ],
    expectedTone: 'neutral',
    hasDrift: true,
    driftType: 'value',
    groundTruth: {
      driftLocation: 1,
      driftReason: 'Actively promoting competitor violates brand value',
    },
  },

  {
    id: 'tn-7',
    messages: [
      { role: 'user', content: 'What security measures do you have?' },
      { role: 'assistant', content: 'We use industry-standard encryption, regular security audits, and comply with SOC 2 Type II standards.' },
    ],
    expectedTone: 'professional',
    hasDrift: false,
    groundTruth: {},
  },

  {
    id: 'edge-4',
    messages: [
      { role: 'user', content: 'Can you help me understand this error message?' },
      { role: 'assistant', content: 'I understand this can be confusing. Let me explain what this error means and how to resolve it.' },
    ],
    expectedTone: 'professional',
    hasDrift: false,
    groundTruth: {
      driftReason: 'Empathetic but professional response is appropriate',
    },
  },
];

/**
 * Get test cases by category
 */
export function getTestCasesByType(type: 'tone' | 'value' | 'edge' | 'multi'): TestCase[] {
  return evaluationDataset.filter(tc => tc.id.startsWith(type) || tc.id.includes(type));
}

/**
 * Get test cases with drift
 */
export function getDriftCases(): TestCase[] {
  return evaluationDataset.filter(tc => tc.hasDrift);
}

/**
 * Get test cases without drift
 */
export function getNoDriftCases(): TestCase[] {
  return evaluationDataset.filter(tc => !tc.hasDrift);
}

/**
 * Get summary statistics
 */
export function getDatasetStats() {
  return {
    total: evaluationDataset.length,
    withDrift: getDriftCases().length,
    withoutDrift: getNoDriftCases().length,
    toneTests: getTestCasesByType('tone').length,
    valueTests: getTestCasesByType('value').length,
    edgeCases: getTestCasesByType('edge').length,
    multiTurn: getTestCasesByType('multi').length,
  };
}
