
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { API_BASE_URL } from '../utils';

const Footer: React.FC = () => {
  const [version, setVersion] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [changelog, setChangelog] = useState<string>('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/versi.txt`)
      .then(res => res.text())
      .then(text => setVersion(text.trim()))
      .catch(() => setVersion('v1.0'));
  }, []);

  const handleVersionClick = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/data-perubahan.txt`);
      const text = await res.text();
      setChangelog(text);
      setShowModal(true);
    } catch (e) {
      console.error("Failed to load changelog");
    }
  };

  return (
    <>
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-4 px-6 text-center md:text-left print-footer-hide transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 dark:text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} <span className="font-semibold text-slate-700 dark:text-slate-300">RDR Finance</span>. All rights reserved. 
            <button onClick={handleVersionClick} className="ml-2 hover:text-blue-600 hover:underline font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded cursor-pointer transition-colors text-slate-600 dark:text-slate-300">
              {version}
            </button>
          </p>
          <p className="mt-1 md:mt-0">Build in Garuda Cyber</p>
        </div>
      </footer>

      {/* Changelog Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col transition-colors">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 rounded-t-xl">
              <h3 className="font-bold text-slate-800 dark:text-white">Riwayat Perubahan Sistem</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-slate-600 dark:text-slate-300">
              <div dangerouslySetInnerHTML={{ __html: changelog }} />
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 text-right bg-slate-50 dark:bg-slate-700/50 rounded-b-xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 dark:bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-900 dark:hover:bg-slate-500 transition-colors">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;
