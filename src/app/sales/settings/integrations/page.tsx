import React from 'react';
import { TMBillConfig } from "@/components/integrations/TMBillConfig";
import MappingClient from '@/components/integrations/MappingClient';
import { getSalesChannels, getPosMappings } from './mapping-actions';

export default async function Page(props: { searchParams: Promise<{ organizationId?: string }> }) { 
  const searchParams = await props.searchParams;
  const organizationId = searchParams?.organizationId;

  let channels = [];
  let initialMappings = [];

  if (organizationId) {
    const [channelsRes, mappingsRes] = await Promise.all([
      getSalesChannels(organizationId),
      getPosMappings(organizationId)
    ]);
    channels = channelsRes.success ? channelsRes.channels : [];
    initialMappings = mappingsRes.success ? mappingsRes.mappings : [];
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integration Settings</h1>
        <p className="text-gray-500">Configure external system connections and APIs.</p>
      </div>
      <TMBillConfig />
      
      {organizationId ? (
        <div className="mt-8">
          <MappingClient 
            organizationId={organizationId} 
            initialMappings={initialMappings} 
            channels={channels} 
          />
        </div>
      ) : (
        <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-500">Please select an organization from the top navigation to view Channel Mappings.</p>
        </div>
      )}
    </div>
  ); 
}
