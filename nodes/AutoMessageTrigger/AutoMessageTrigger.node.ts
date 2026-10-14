// autoMessage Trigger — polling trigger for new iMessages, conversations and
// contacts. Messages dedupe on a sentDate watermark + seen-ID ring (the API's
// `since` is inclusive); conversations/contacts dedupe on a bounded seen-ID
// set. First poll seeds state without firing (except in manual test mode,
// which returns the latest item so users can map fields).

import type {
    IDataObject,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    IPollFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

const MAX_SEEN_IDS = 3000;

export class AutoMessageTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'autoMessage Trigger',
        name: 'autoMessageTrigger',
        icon: { light: 'file:automessage.svg', dark: 'file:automessage.svg' },
        group: ['trigger'],
        version: 1,
        subtitle: '={{$parameter["event"]}}',
        description:
            'Starts a workflow when an iMessage or SMS text is received or sent, or a new conversation or contact appears in autoMessage',
        defaults: { name: 'autoMessage Trigger' },
        polling: true,
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        credentials: [{ name: 'autoMessageApi', required: true }],
        properties: [
            {
                displayName: 'Event',
                name: 'event',
                type: 'options',
                default: 'messageReceived',
                options: [
                    {
                        name: 'iMessage Received',
                        value: 'messageReceived',
                        description: 'A new iMessage or SMS text arrived on your Mac',
                    },
                    {
                        name: 'iMessage Sent',
                        value: 'messageSent',
                        description:
                            'An iMessage was sent from your Mac (by hand, dashboard, or API)',
                    },
                    {
                        name: 'New Conversation',
                        value: 'newConversation',
                        description: 'A brand-new conversation thread appeared',
                    },
                    {
                        name: 'New Contact',
                        value: 'newContact',
                        description: 'A contact was added to your autoMessage address book',
                    },
                ],
            },
        ],
    };

    async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
        const event = this.getNodeParameter('event') as string;
        const credentials = await this.getCredentials('autoMessageApi');
        const baseUrl = ((credentials.baseUrl as string) || 'https://api.automessage.app').replace(/\/+$/, '');
        const staticData = this.getWorkflowStaticData('node') as {
            lastSentDate?: string;
            seenIds?: string[];
        };
        const isManual = this.getMode() === 'manual';

        const request = async (path: string, qs: IDataObject): Promise<IDataObject[]> => {
            const response = (await this.helpers.httpRequestWithAuthentication.call(
                this,
                'autoMessageApi',
                { method: 'GET', url: `${baseUrl}${path}`, qs, json: true },
            )) as IDataObject;
            return (response.data as IDataObject[]) ?? [];
        };

        let items: IDataObject[] = [];

        if (event === 'messageReceived' || event === 'messageSent') {
            const direction = event === 'messageReceived' ? 'inbound' : 'outbound';
            const qs: IDataObject = { direction, limit: 100 };
            if (staticData.lastSentDate) qs.since = staticData.lastSentDate;
            const messages = await request('/v1/messages', qs);

            if (isManual) return messages.length > 0 ? [this.helpers.returnJsonArray([messages[0]])] : null;

            const seen = new Set(staticData.seenIds ?? []);
            const firstPoll = !staticData.lastSentDate;
            items = firstPoll ? [] : messages.filter((m) => !seen.has(String(m.id)));

            // Advance the watermark to the newest sentDate (list is desc).
            const newest = messages.find((m) => typeof m.sentDate === 'string');
            if (newest) staticData.lastSentDate = newest.sentDate as string;
            else if (firstPoll) staticData.lastSentDate = new Date().toISOString();
            staticData.seenIds = [
                ...messages.map((m) => String(m.id)),
                ...(staticData.seenIds ?? []),
            ].slice(0, MAX_SEEN_IDS);
        } else {
            const path = event === 'newConversation' ? '/v1/conversations' : '/v1/contacts';
            const records = await request(path, { limit: event === 'newContact' ? 500 : 100 });

            if (isManual) return records.length > 0 ? [this.helpers.returnJsonArray([records[0]])] : null;

            const seen = new Set(staticData.seenIds ?? []);
            const firstPoll = (staticData.seenIds ?? []).length === 0;
            items = firstPoll ? [] : records.filter((r) => !seen.has(String(r.id)));
            staticData.seenIds = [
                ...records.map((r) => String(r.id)),
                ...(staticData.seenIds ?? []),
            ].slice(0, MAX_SEEN_IDS);
        }

        if (items.length === 0) return null;
        return [this.helpers.returnJsonArray(items)];
    }
}
