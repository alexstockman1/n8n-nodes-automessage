import type {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class AutoMessageApi implements ICredentialType {
    name = 'autoMessageApi';

    displayName = 'autoMessage API';

    documentationUrl = 'https://automessage.app/api';

    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            required: true,
            default: '',
            description:
                'Your autoMessage API key (starts with "am_"). Find or regenerate it at go.automessage.app → Settings → API. Sending requires a full-scope key; a read-only key works for triggers and reads.',
        },
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string',
            default: 'https://api.automessage.app',
            description: 'Only change this if autoMessage support tells you to',
        },
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                'X-API-KEY': '={{$credentials.apiKey}}',
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            baseURL: '={{$credentials.baseUrl}}',
            url: '/v1/status',
        },
    };
}
