'use client'

import { useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'

interface Contract {
  id: string
  contact: string
  type: 'check-in' | 'response-time'
  frequency: string
  details: string
}

export default function CommunicationSettings() {
  const [contracts, setContracts] = useState<Contract[]>([
    {
      id: '1',
      contact: 'Mom',
      type: 'check-in',
      frequency: 'weekly',
      details: 'Weekly catch-up call',
    },
    {
      id: '2',
      contact: 'Team Lead',
      type: 'response-time',
      frequency: '24h',
      details: 'Respond to work messages within 24 hours',
    },
  ])

  const [showNewContract, setShowNewContract] = useState(false)
  const [newContract, setNewContract] = useState<Partial<Contract>>({
    type: 'check-in',
    frequency: 'weekly',
  })

  const handleAddContract = () => {
    if (newContract.contact && newContract.details) {
      setContracts([
        ...contracts,
        {
          id: Date.now().toString(),
          contact: newContract.contact,
          type: newContract.type as 'check-in' | 'response-time',
          frequency: newContract.frequency,
          details: newContract.details,
        },
      ])
      setShowNewContract(false)
      setNewContract({ type: 'check-in', frequency: 'weekly' })
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Communication Settings
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>Set up communication preferences and mini contracts with your contacts.</p>
        </div>

        {/* Existing Contracts */}
        <div className="mt-6 space-y-4">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-900">{contract.contact}</p>
                <p className="text-sm text-gray-500">{contract.details}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {contract.type === 'check-in' ? 'Check-in' : 'Response Time'}: {contract.frequency}
                </p>
              </div>
              <button
                type="button"
                className="text-sm text-red-600 hover:text-red-500"
                onClick={() =>
                  setContracts(contracts.filter((c) => c.id !== contract.id))
                }
                aria-label={`Remove contract with ${contract.contact}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* Add New Contract */}
        {showNewContract ? (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-4">
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700">
                  Contact Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={newContract.contact || ''}
                  onChange={(e) =>
                    setNewContract({ ...newContract, contact: e.target.value })
                  }
                  placeholder="Enter contact name"
                  aria-label="Contact name"
                />
              </div>

              <div>
                <label htmlFor="contract-type" className="block text-sm font-medium text-gray-700">
                  Contract Type
                </label>
                <select
                  id="contract-type"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={newContract.type}
                  onChange={(e) =>
                    setNewContract({
                      ...newContract,
                      type: e.target.value as 'check-in' | 'response-time',
                    })
                  }
                  aria-label="Select contract type"
                >
                  <option value="check-in">Regular Check-in</option>
                  <option value="response-time">Response Time</option>
                </select>
              </div>

              <div>
                <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
                  Frequency
                </label>
                <select
                  id="frequency"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={newContract.frequency}
                  onChange={(e) =>
                    setNewContract({ ...newContract, frequency: e.target.value })
                  }
                  aria-label="Select frequency"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="24h">Within 24 hours</option>
                  <option value="48h">Within 48 hours</option>
                </select>
              </div>

              <div>
                <label htmlFor="contract-details" className="block text-sm font-medium text-gray-700">
                  Details
                </label>
                <textarea
                  id="contract-details"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  rows={2}
                  value={newContract.details || ''}
                  onChange={(e) =>
                    setNewContract({ ...newContract, details: e.target.value })
                  }
                  placeholder="Enter contract details"
                  aria-label="Contract details"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => setShowNewContract(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={handleAddContract}
                >
                  Add Contract
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={() => setShowNewContract(true)}
            aria-label="Add new communication contract"
          >
            <PlusIcon className="h-5 w-5 mr-2" aria-hidden="true" />
            Add New Contract
          </button>
        )}
      </div>
    </div>
  )
} 