/**
 * Engineer-Klasse für die Reparatur von Energiequellen
 */
class Engineer {
    constructor(scene, x, y) {
        this.scene = scene;
        
        // Sprite erstellen (temporär ein einfaches Rechteck)
        this.sprite = scene.add.rectangle(x, y, 30, 30, 0xFF0000);
        this.sprite.setStrokeStyle(2, 0xFFFFFF);
        
        // Physik aktivieren
        scene.physics.add.existing(this.sprite);
        this.sprite.body.setCollideWorldBounds(true);
        
        // Eigenschaften
        this.speed = 200;
        this.repairing = false;
        this.currentTarget = null;
        this.repairRange = 50; // Reichweite für Reparaturen
        
        // Statustext
        this.statusText = scene.add.text(x, y - 40, 'Engineer', {
            fontFamily: 'Arial',
            fontSize: 12,
            color: '#ffffff',
            align: 'center',
            backgroundColor: '#000000'
        }).setOrigin(0.5);
        
        // Klick-Handler für Bewegung
        scene.input.on('pointerdown', (pointer) => {
            // Nur bewegen, wenn nicht gerade repariert wird
            if (!this.repairing) {
                this.moveTo(pointer.x, pointer.y);
            }
        });
    }
    
    // Zu einer Position bewegen
    moveTo(x, y) {
        // Bewegung stoppen, falls eine Reparatur läuft
        if (this.repairing) return;
        
        // Bewegung zum Ziel
        this.scene.physics.moveTo(this.sprite, x, y, this.speed);
        
        // Ziel speichern
        this.targetX = x;
        this.targetY = y;
        
        // Status aktualisieren
        this.updateStatusText('Moving');
    }
    
    // Reparatur starten
    startRepair(energySource) {
        if (this.repairing) return;
        
        // Prüfen, ob die Energiequelle in Reichweite ist
        const distance = Phaser.Math.Distance.Between(
            this.sprite.x, this.sprite.y,
            energySource.sprite.x, energySource.sprite.y
        );
        
        if (distance <= this.repairRange) {
            // Bewegung stoppen
            this.sprite.body.setVelocity(0, 0);
            
            // Reparatur starten
            this.repairing = true;
            this.currentTarget = energySource;
            
            // Status aktualisieren
            this.updateStatusText('Repairing...');
            
            // Reparatur-Timer
            this.scene.time.delayedCall(energySource.config.repairTime, () => {
                // Reparatur abschließen
                if (this.currentTarget === energySource) {
                    energySource.completeRepair();
                    this.repairing = false;
                    this.currentTarget = null;
                    this.updateStatusText('Engineer');
                }
            });
            
            return true;
        }
        
        return false;
    }
    
    // Status aktualisieren
    updateStatusText(text) {
        this.statusText.setText(text);
        this.statusText.x = this.sprite.x;
        this.statusText.y = this.sprite.y - 40;
    }
    
    // Update-Methode für die Spielschleife
    update() {
        // Status-Text Position aktualisieren
        this.statusText.x = this.sprite.x;
        this.statusText.y = this.sprite.y - 40;
        
        // Prüfen, ob das Bewegungsziel erreicht wurde
        if (!this.repairing && this.targetX !== undefined && this.targetY !== undefined) {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x, this.sprite.y,
                this.targetX, this.targetY
            );
            
            // Wenn nah genug am Ziel, anhalten
            if (distance < 5) {
                this.sprite.body.setVelocity(0, 0);
                this.updateStatusText('Engineer');
                this.targetX = undefined;
                this.targetY = undefined;
            }
        }
        
        // Prüfen, ob eine Energiequelle in der Nähe ist, die repariert werden muss
        if (!this.repairing) {
            this.checkNearbyBrokenSources();
        }
    }
    
    // Prüfen, ob kaputte Energiequellen in der Nähe sind
    checkNearbyBrokenSources() {
        const energySources = this.scene.energySources;
        
        for (let i = 0; i < energySources.length; i++) {
            const source = energySources[i];
            
            if (source.broken && !source.repairing) {
                const distance = Phaser.Math.Distance.Between(
                    this.sprite.x, this.sprite.y,
                    source.sprite.x, source.sprite.y
                );
                
                // Visuellen Hinweis anzeigen, wenn eine kaputte Quelle in der Nähe ist
                if (distance <= this.repairRange * 2) {
                    // Hier könnte ein visueller Hinweis angezeigt werden
                    this.updateStatusText('Repair needed nearby!');
                    break;
                }
            }
        }
    }
    
    // Aufräumen beim Zerstören
    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.statusText) this.statusText.destroy();
    }
}