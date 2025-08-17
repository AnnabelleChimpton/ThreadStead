import React, { useEffect, useState } from 'react';
import { TemplateEngine } from '@/lib/template-engine';
import { fetchCurrentUserResidentData } from '@/lib/template-data';
import type { ResidentData } from '@/components/template/ResidentDataProvider';

export default function SimpleTemplateTest() {
  const [residentData, setResidentData] = useState<ResidentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Test with a very simple template
  const testTemplate = '<div><SimpleTest message="Hello World!" /><DataDebug /></div>';

  useEffect(() => {
    async function loadData() {
      try {
        console.log('Starting to load current user data...');
        const data = await fetchCurrentUserResidentData();
        console.log('fetchCurrentUserResidentData result:', data);
        
        if (data) {
          setResidentData(data);
          console.log('Using real user data');
        } else {
          // Fallback to mock data
          console.log('No real user data found, using mock data');
          setResidentData(TemplateEngine.createMockData('testuser'));
        }
      } catch (err) {
        console.error('Error in loadData:', err);
        setError(String(err));
        // Fallback to mock data
        setResidentData(TemplateEngine.createMockData('testuser'));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Simple Template Test - Loading...</h1>
        <p>Loading user data...</p>
      </div>
    );
  }

  if (!residentData) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Simple Template Test - No Data</h1>
        <p>Failed to load user data and fallback failed.</p>
        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded">
            <p className="text-red-800 font-medium">Error:</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>
    );
  }

  try {
    const compiled = TemplateEngine.compile({
      html: testTemplate,
      mode: 'custom-tags'
    });

    console.log('Compilation result:', compiled);

    if (compiled.success && compiled.ast) {
      const rendered = TemplateEngine.render({
        ast: compiled.ast,
        residentData: residentData,
        mode: 'preview'
      });

      console.log('Render result:', rendered);

      if (rendered.success && rendered.content) {
        return (
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Simple Template Test</h1>
            <div className="border p-4">
              {rendered.content}
            </div>
          </div>
        );
      } else {
        return (
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Simple Template Test - Render Error</h1>
            <pre className="bg-red-100 p-4 text-red-800">
              {JSON.stringify(rendered.errors, null, 2)}
            </pre>
          </div>
        );
      }
    } else {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Simple Template Test - Compile Error</h1>
          <pre className="bg-red-100 p-4 text-red-800">
            {JSON.stringify(compiled.errors, null, 2)}
          </pre>
        </div>
      );
    }
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Simple Template Test - Exception</h1>
        <pre className="bg-red-100 p-4 text-red-800">
          {String(error)}
        </pre>
      </div>
    );
  }
}