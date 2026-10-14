// autoMessage node — declarative REST node over https://api.automessage.app.
//
// Full /v1 surface: send iMessages (drafts), read messages/conversations,
// manage drafts and contacts, check connector status. Error envelopes
// ({error:{code,message}}) surface via the API's HTTP status codes — n8n
// shows the response body on failure.

import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

const unwrapData = {
    postReceive: [
        {
            type: 'rootProperty' as const,
            properties: { property: 'data' },
        },
    ],
};

export class AutoMessage implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'autoMessage',
        name: 'autoMessage',
        icon: 'file:automessage.png',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description:
            'Send and receive iMessage and SMS texts from your own Mac and Apple ID via autoMessage',
        defaults: { name: 'autoMessage' },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        usableAsTool: true,
        credentials: [{ name: 'autoMessageApi', required: true }],
        requestDefaults: {
            baseURL: '={{$credentials.baseUrl}}',
            headers: { Accept: 'application/json' },
        },
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                default: 'message',
                options: [
                    { name: 'Message', value: 'message', description: 'iMessage/SMS texts' },
                    { name: 'Conversation', value: 'conversation' },
                    { name: 'Draft', value: 'draft', description: 'Queued outbound sends' },
                    { name: 'Contact', value: 'contact' },
                    { name: 'Connector Status', value: 'status' },
                ],
            },

            // ---- Message -----------------------------------------------------
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: { show: { resource: ['message'] } },
                default: 'send',
                options: [
                    {
                        name: 'Send',
                        value: 'send',
                        action: 'Send an iMessage',
                        description: 'Send an iMessage or SMS text from your own Apple ID',
                        routing: {
                            request: { method: 'POST', url: '/v1/drafts' },
                            output: unwrapData.postReceive ? unwrapData : undefined,
                        },
                    },
                    {
                        name: 'Get Many',
                        value: 'getMany',
                        action: 'Get many messages',
                        description: 'List recent iMessages across all conversations',
                        routing: {
                            request: { method: 'GET', url: '/v1/messages' },
                            output: unwrapData,
                        },
                    },
                    {
                        name: 'Get',
                        value: 'get',
                        action: 'Get a message',
                        description: 'Look up one iMessage by its message GUID',
                        routing: {
                            request: {
                                method: 'GET',
                                url: '=/v1/messages/{{encodeURIComponent($parameter.messageGuid)}}',
                            },
                            output: unwrapData,
                        },
                    },
                ],
            },
            {
                displayName: 'To',
                name: 'to',
                type: 'string',
                required: true,
                default: '',
                placeholder: '+14155551234',
                description:
                    'Recipient phone number (E.164 preferred; US formats are normalized) or iMessage email address',
                displayOptions: { show: { resource: ['message'], operation: ['send'] } },
                routing: { send: { type: 'body', property: 'to' } },
            },
            {
                displayName: 'Message',
                name: 'body',
                type: 'string',
                typeOptions: { rows: 3 },
                required: true,
                default: '',
                description: 'The text to send',
                displayOptions: { show: { resource: ['message'], operation: ['send'] } },
                routing: { send: { type: 'body', property: 'body' } },
            },
            {
                displayName: 'Message GUID',
                name: 'messageGuid',
                type: 'string',
                required: true,
                default: '',
                displayOptions: { show: { resource: ['message'], operation: ['get'] } },
            },
            {
                displayName: 'Filters',
                name: 'messageFilters',
                type: 'collection',
                placeholder: 'Add Filter',
                default: {},
                displayOptions: { show: { resource: ['message'], operation: ['getMany'] } },
                options: [
                    {
                        displayName: 'Direction',
                        name: 'direction',
                        type: 'options',
                        default: 'inbound',
                        options: [
                            { name: 'Inbound (Received)', value: 'inbound' },
                            { name: 'Outbound (Sent)', value: 'outbound' },
                        ],
                        routing: { send: { type: 'query', property: 'direction' } },
                    },
                    {
                        displayName: 'Since',
                        name: 'since',
                        type: 'dateTime',
                        default: '',
                        routing: { send: { type: 'query', property: 'since' } },
                    },
                    {
                        displayName: 'Before',
                        name: 'before',
                        type: 'dateTime',
                        default: '',
                        routing: { send: { type: 'query', property: 'before' } },
                    },
                    {
                        displayName: 'Limit',
                        name: 'limit',
                        type: 'number',
                        typeOptions: { minValue: 1 },
                        default: 50,
                        description: 'Max number of results to return',
                        routing: { send: { type: 'query', property: 'limit' } },
                    },
                ],
            },

            // ---- Conversation ------------------------------------------------
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: { show: { resource: ['conversation'] } },
                default: 'getMany',
                options: [
                    {
                        name: 'Get Many',
                        value: 'getMany',
                        action: 'Get many conversations',
                        description: 'List or search iMessage conversations',
                        routing: {
                            request: { method: 'GET', url: '/v1/conversations' },
                            output: unwrapData,
                        },
                    },
                    {
                        name: 'Get',
                        value: 'get',
                        action: 'Get a conversation',
                        routing: {
                            request: {
                                method: 'GET',
                                url: '=/v1/conversations/{{encodeURIComponent($parameter.conversationId)}}',
                            },
                            output: unwrapData,
                        },
                    },
                    {
                        name: 'Get Messages',
                        value: 'getMessages',
                        action: 'Get messages in a conversation',
                        description: 'List the iMessages in one conversation',
                        routing: {
                            request: {
                                method: 'GET',
                                url: '=/v1/conversations/{{encodeURIComponent($parameter.conversationId)}}/messages',
                            },
                            output: unwrapData,
                        },
                    },
                ],
            },
            {
                displayName: 'Conversation ID',
                name: 'conversationId',
                type: 'string',
                required: true,
                default: '',
                description: 'The conversation ID returned by Get Many (not the chat GUID)',
                displayOptions: {
                    show: { resource: ['conversation'], operation: ['get', 'getMessages'] },
                },
            },
            {
                displayName: 'Filters',
                name: 'conversationFilters',
                type: 'collection',
                placeholder: 'Add Filter',
                default: {},
                displayOptions: { show: { resource: ['conversation'], operation: ['getMany'] } },
                options: [
                    {
                        displayName: 'Participant (Phone or Email)',
                        name: 'participant',
                        type: 'string',
                        default: '',
                        description:
                            'Exact handle match — finds 1:1 and group chats with this person. Do not combine with Name.',
                        routing: { send: { type: 'query', property: 'participant' } },
                    },
                    {
                        displayName: 'Name Contains',
                        name: 'name',
                        type: 'string',
                        default: '',
                        description:
                            'Case-insensitive match on the conversation display name. Do not combine with Participant.',
                        routing: { send: { type: 'query', property: 'name' } },
                    },
                    {
                        displayName: 'Limit',
                        name: 'limit',
                        type: 'number',
                        typeOptions: { minValue: 1 },
                        default: 50,
                        description: 'Max number of results to return',
                        routing: { send: { type: 'query', property: 'limit' } },
                    },
                ],
            },
            {
                displayName: 'Limit',
                name: 'messagesLimit',
                type: 'number',
                typeOptions: { minValue: 1 },
                default: 50,
                description: 'Max number of results to return',
                displayOptions: { show: { resource: ['conversation'], operation: ['getMessages'] } },
                routing: { send: { type: 'query', property: 'limit' } },
            },

            // ---- Draft -------------------------------------------------------
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: { show: { resource: ['draft'] } },
                default: 'get',
                options: [
                    {
                        name: 'Get',
                        value: 'get',
                        action: 'Get a draft',
                        description: 'Check whether a queued iMessage sent (status: pending/sent/held/failed)',
                        routing: {
                            request: {
                                method: 'GET',
                                url: '=/v1/drafts/{{encodeURIComponent($parameter.draftId)}}',
                            },
                            output: unwrapData,
                        },
                    },
                    {
                        name: 'Get Many',
                        value: 'getMany',
                        action: 'Get many drafts',
                        routing: {
                            request: { method: 'GET', url: '/v1/drafts' },
                            output: unwrapData,
                        },
                    },
                    {
                        name: 'Update',
                        value: 'update',
                        action: 'Update a pending draft',
                        description: 'Edit recipient/text while the iMessage has not sent yet',
                        routing: {
                            request: {
                                method: 'PATCH',
                                url: '=/v1/drafts/{{encodeURIComponent($parameter.draftId)}}',
                            },
                            output: unwrapData,
                        },
                    },
                    {
                        name: 'Cancel',
                        value: 'cancel',
                        action: 'Cancel a pending draft',
                        description: 'Stop a queued iMessage before it sends',
                        routing: {
                            request: {
                                method: 'DELETE',
                                url: '=/v1/drafts/{{encodeURIComponent($parameter.draftId)}}',
                            },
                            output: {
                                postReceive: [
                                    {
                                        type: 'set' as const,
                                        properties: {
                                            value: '={{ { "id": $parameter.draftId, "cancelled": true } }}',
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ],
            },
            {
                displayName: 'Draft ID',
                name: 'draftId',
                type: 'string',
                required: true,
                default: '',
                displayOptions: { show: { resource: ['draft'], operation: ['get', 'update', 'cancel'] } },
            },
            {
                displayName: 'Update Fields',
                name: 'draftUpdateFields',
                type: 'collection',
                placeholder: 'Add Field',
                default: {},
                displayOptions: { show: { resource: ['draft'], operation: ['update'] } },
                options: [
                    {
                        displayName: 'To',
                        name: 'to',
                        type: 'string',
                        default: '',
                        routing: { send: { type: 'body', property: 'to' } },
                    },
                    {
                        displayName: 'Message',
                        name: 'body',
                        type: 'string',
                        typeOptions: { rows: 3 },
                        default: '',
                        routing: { send: { type: 'body', property: 'body' } },
                    },
                ],
            },
            {
                displayName: 'Filters',
                name: 'draftFilters',
                type: 'collection',
                placeholder: 'Add Filter',
                default: {},
                displayOptions: { show: { resource: ['draft'], operation: ['getMany'] } },
                options: [
                    {
                        displayName: 'Status',
                        name: 'status',
                        type: 'options',
                        default: 'queued',
                        options: [
                            { name: 'Queued', value: 'queued' },
                            { name: 'Sending', value: 'sending' },
                            { name: 'Cancelled', value: 'cancelled' },
                            { name: 'Failed', value: 'failed' },
                        ],
                        routing: { send: { type: 'query', property: 'status' } },
                    },
                    {
                        displayName: 'Limit',
                        name: 'limit',
                        type: 'number',
                        typeOptions: { minValue: 1 },
                        default: 50,
                        description: 'Max number of results to return',
                        routing: { send: { type: 'query', property: 'limit' } },
                    },
                ],
            },

            // ---- Contact -----------------------------------------------------
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: { show: { resource: ['contact'] } },
                default: 'upsert',
                options: [
                    {
                        name: 'Create or Update',
                        value: 'upsert',
                        action: 'Create or update a contact',
                        description: 'Idempotent upsert keyed on phone/email',
                        routing: {
                            request: { method: 'POST', url: '/v1/contacts' },
                            output: unwrapData,
                        },
                    },
                    {
                        name: 'Get Many',
                        value: 'getMany',
                        action: 'Get many contacts',
                        routing: {
                            request: { method: 'GET', url: '/v1/contacts', qs: { limit: 500 } },
                            output: unwrapData,
                        },
                    },
                    {
                        name: 'Get',
                        value: 'get',
                        action: 'Get a contact',
                        routing: {
                            request: {
                                method: 'GET',
                                url: '=/v1/contacts/{{encodeURIComponent($parameter.contactId)}}',
                            },
                            output: unwrapData,
                        },
                    },
                    {
                        name: 'Delete',
                        value: 'delete',
                        action: 'Delete a contact',
                        routing: {
                            request: {
                                method: 'DELETE',
                                url: '=/v1/contacts/{{encodeURIComponent($parameter.contactId)}}',
                            },
                            output: {
                                postReceive: [
                                    {
                                        type: 'set' as const,
                                        properties: {
                                            value: '={{ { "id": $parameter.contactId, "deleted": true } }}',
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ],
            },
            {
                displayName: 'Contact ID',
                name: 'contactId',
                type: 'string',
                required: true,
                default: '',
                displayOptions: { show: { resource: ['contact'], operation: ['get', 'delete'] } },
            },
            {
                displayName: 'Phone Number',
                name: 'phoneNumber',
                type: 'string',
                default: '',
                description: 'E.164 preferred (e.g. +14155551234). Provide a phone, an email, or both.',
                displayOptions: { show: { resource: ['contact'], operation: ['upsert'] } },
                routing: { send: { type: 'body', property: 'phone_number' } },
            },
            {
                displayName: 'Email',
                name: 'email',
                type: 'string',
                placeholder: 'name@email.com',
                default: '',
                displayOptions: { show: { resource: ['contact'], operation: ['upsert'] } },
                routing: { send: { type: 'body', property: 'email' } },
            },
            {
                displayName: 'Display Name',
                name: 'displayName',
                type: 'string',
                default: '',
                displayOptions: { show: { resource: ['contact'], operation: ['upsert'] } },
                routing: { send: { type: 'body', property: 'display_name' } },
            },

            // ---- Connector status --------------------------------------------
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: { show: { resource: ['status'] } },
                default: 'get',
                options: [
                    {
                        name: 'Get',
                        value: 'get',
                        action: 'Get Mac connector status',
                        description:
                            'Check whether the Mac connector is online before sending iMessages',
                        routing: {
                            request: { method: 'GET', url: '/v1/status' },
                            output: unwrapData,
                        },
                    },
                ],
            },
        ],
    };
}
