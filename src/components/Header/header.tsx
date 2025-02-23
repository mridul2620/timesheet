import React from 'react';
import styles from './header.module.css';

interface User {
  name: string;
  designation: string;
}

interface HeaderProps {
  title: string;
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ title, user }) => {
  return (
    <header className={styles.header}>
      <h1 className={styles.heading}>{title}</h1>
      {user && (
        <div className={styles.userInfo}>
          <div className={styles.userName}>{user.name}</div>
          <div className={styles.userRole}>{user.designation}</div>
        </div>
      )}
    </header>
  );
};

export default Header;